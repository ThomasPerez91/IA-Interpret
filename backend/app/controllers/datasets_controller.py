import os
import uuid
from enum import Enum
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile  # type: ignore
from bson import ObjectId  # type: ignore

from .. import db
from ..config import settings
from .auth_controller import get_current_user
from ..celery_app import celery_app
from ..services.hdfs_client import get_hdfs_client_as

router = APIRouter(prefix="/datasets", tags=["datasets"])

UPLOAD_TMP_DIR = settings.upload_tmp_dir
os.makedirs(UPLOAD_TMP_DIR, exist_ok=True)

ALLOWED_MIME = {"text/csv", "application/vnd.ms-excel",
                "application/csv", "text/plain"}


class DatasetStep(str, Enum):
    INITIAL_ANALYSIS = "initial_analysis"


STATUS_TO_PROGRESS = {
    "queued": 0,
    "uploading_hdfs": 25,
    "analyzing": 75,
    "done": 100,
    "failed": 100,
}


def _count_csv_rows(path: str) -> int:
    count = 0
    last_byte_newline = False
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            count += chunk.count(b"\n")
            last_byte_newline = chunk.endswith(b"\n")
    if not last_byte_newline and os.path.getsize(path) > 0:
        count += 1
    return count


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    # ⚠️ le nom donné par l’utilisateur arrive en multipart -> Form(...)
    dataset_name: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_MIME and not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400, detail="Le fichier doit être un CSV")

    # Sauvegarde temporaire (volume partagé backend/worker)
    ext = ".csv" if not file.filename.lower().endswith(".csv") else ""
    tmp_name = f"{uuid.uuid4().hex}{ext}"
    tmp_path = os.path.join(UPLOAD_TMP_DIR, tmp_name)
    with open(tmp_path, "wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)

    # Limite de lignes
    rows = _count_csv_rows(tmp_path)
    if rows - 1 > settings.max_csv_rows:
        os.remove(tmp_path)
        raise HTTPException(
            status_code=400,
            detail=f"Le CSV dépasse la limite de {settings.max_csv_rows} lignes",
        )

    # Nom saisi par l'utilisateur (peut être vide) + nom du fichier réel
    custom_name = (dataset_name or "").strip() or None
    filename = file.filename
    display_name = custom_name or filename

    now = datetime.utcnow()
    # On enregistre TOUT : filename (réel), custom_name (optionnel), name (affichage)
    info_doc = {
        "user_id": ObjectId(current_user["_id"]),
        # nom affiché (custom si présent, sinon filename)
        "name": display_name,
        # nom saisi par l'utilisateur (ou null)
        "custom_name": custom_name,
        "filename": filename,            # nom de fichier réel avec extension
        "status": "queued",
        "step": DatasetStep.INITIAL_ANALYSIS.value,
        "row_count": None,
        "column_count": None,
        "hdfs_path": None,
        "error_message": None,
        "created_at": now,
        "updated_at": now,
    }
    res = db.datasets_infos.insert_one(info_doc)
    dataset_id = str(res.inserted_id)

    # Lancement tâche Celery
    celery_app.send_task(
        "datasets.process_csv",
        kwargs={
            "dataset_id": dataset_id,
            "user_id": str(current_user["_id"]),
            "local_path": tmp_path,
            "filename": filename,
        },
    )

    return {
        "dataset_id": dataset_id,
        "status": "queued",
        "message": "Upload reçu. Traitement en cours.",
    }


@router.get("/", summary="Lister mes datasets")
def list_datasets(current_user: dict = Depends(get_current_user)):
    items = []
    for d in db.datasets_infos.find(
        {"user_id": ObjectId(current_user["_id"])}
    ).sort("created_at", -1):
        # on renvoie aussi filename/custom_name au cas où le front en a besoin
        items.append({
            "id": str(d["_id"]),
            "name": d.get("name"),  # affichage
            "filename": d.get("filename"),
            "custom_name": d.get("custom_name"),
            "row_count": d.get("row_count"),
            "column_count": d.get("column_count"),
            "step": d.get("step"),
            "status": d.get("status"),
            "created_at": d.get("created_at"),
        })
    return {"items": items}


@router.get("/{dataset_id}", summary="Détails d'un dataset (info + analyse si dispo)")
def get_dataset(dataset_id: str, current_user: dict = Depends(get_current_user)):
    info = db.datasets_infos.find_one(
        {"_id": ObjectId(dataset_id), "user_id": ObjectId(current_user["_id"])}
    )
    if not info:
        raise HTTPException(status_code=404, detail="Dataset introuvable")

    payload = {
        "id": str(info["_id"]),
        # affichage (custom_name ou filename)
        "name": info.get("name"),
        "custom_name": info.get("custom_name"),
        "filename": info.get("filename"),
        "status": info.get("status"),
        "step": info.get("step"),
        "row_count": info.get("row_count"),
        "column_count": info.get("column_count"),
        "hdfs_path": info.get("hdfs_path"),
        "error_message": info.get("error_message"),
        "created_at": info.get("created_at"),
        "updated_at": info.get("updated_at"),
    }

    analysis = db.datasets_initial_analyze.find_one(
        {"dataset_id": ObjectId(dataset_id),
         "user_id": ObjectId(current_user["_id"])}
    )
    if analysis:
        a = dict(analysis)
        a["id"] = str(a.pop("_id"))
        if isinstance(a.get("dataset_id"), ObjectId):
            a["dataset_id"] = str(a["dataset_id"])
        if isinstance(a.get("user_id"), ObjectId):
            a["user_id"] = str(a["user_id"])
        payload["analysis"] = a

    return payload


@router.get("/{dataset_id}/status", summary="Statut + progression (0-100)")
def get_status(dataset_id: str, current_user: dict = Depends(get_current_user)):
    info = db.datasets_infos.find_one(
        {"_id": ObjectId(dataset_id), "user_id": ObjectId(current_user["_id"])}
    )
    if not info:
        raise HTTPException(status_code=404, detail="Dataset introuvable")

    status = info.get("status", "queued")
    progress = STATUS_TO_PROGRESS.get(status, 0)

    return {
        "dataset_id": dataset_id,
        "status": status,
        "step": info.get("step"),
        "progress": progress,
        "error_message": info.get("error_message"),
        "updated_at": info.get("updated_at"),
    }


@router.delete("/{dataset_id}", summary="Archiver (supprimer DB + HDFS)")
def archive_dataset(dataset_id: str, current_user: dict = Depends(get_current_user)):
    info = db.datasets_infos.find_one(
        {"_id": ObjectId(dataset_id), "user_id": ObjectId(current_user["_id"])}
    )
    if not info:
        raise HTTPException(status_code=404, detail="Dataset introuvable")

    try:
        user_id = str(current_user["_id"])
        dir_path = f"{settings.hdfs_base_dir}/{user_id}/{dataset_id}"
        hdfs_admin = get_hdfs_client_as(settings.hdfs_admin_user)
        try:
            hdfs_admin.delete(dir_path, recursive=True)
        except Exception:
            pass
        hdfs_error = None
    except Exception as e:
        hdfs_error = str(e)

    db.datasets_initial_analyze.delete_one({
        "dataset_id": ObjectId(dataset_id),
        "user_id": ObjectId(current_user["_id"]),
    })
    db.datasets_infos.delete_one({"_id": ObjectId(dataset_id)})

    return {"dataset_id": dataset_id, "archived": True, "hdfs_error": hdfs_error}
