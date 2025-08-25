import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile  # type: ignore
from bson import ObjectId  # type: ignore

from .. import db
from ..config import settings
from .auth_controller import get_current_user
# on envoie la task par nom (pas d'import direct)
from ..celery_app import celery_app

router = APIRouter(prefix="/datasets", tags=["datasets"])

UPLOAD_TMP_DIR = settings.upload_tmp_dir
os.makedirs(UPLOAD_TMP_DIR, exist_ok=True)

ALLOWED_MIME = {"text/csv", "application/vnd.ms-excel",
                "application/csv", "text/plain"}

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
    dataset_name: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_MIME and not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400, detail="Le fichier doit être un CSV")

    # Sauvegarde temporaire
    ext = ".csv" if not file.filename.lower().endswith(".csv") else ""
    tmp_name = f"{uuid.uuid4().hex}{ext}"
    tmp_path = os.path.join(UPLOAD_TMP_DIR, tmp_name)

    with open(tmp_path, "wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)

    # Limite 20k lignes (on suppose 1 header => tolère rows-1)
    rows = _count_csv_rows(tmp_path)
    if rows - 1 > settings.max_csv_rows:
        os.remove(tmp_path)
        raise HTTPException(
            status_code=400,
            detail=f"Le CSV dépasse la limite de {settings.max_csv_rows} lignes",
        )

    now = datetime.utcnow()
    # Document d’infos (datasets_infos)
    info_doc = {
        "user_id": ObjectId(current_user["_id"]),
        "name": dataset_name or file.filename,
        "filename": file.filename,
        "status": "queued",
        "row_count": None,
        "column_count": None,
        "hdfs_path": None,
        "error_message": None,
        "created_at": now,
        "updated_at": now,
    }
    res = db.datasets_infos.insert_one(info_doc)
    dataset_id = str(res.inserted_id)

    # Task Celery (par nom)
    celery_app.send_task(
        "datasets.process_csv",
        kwargs={
            "dataset_id": dataset_id,
            "user_id": str(current_user["_id"]),
            "local_path": tmp_path,
            "filename": file.filename,
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
    for d in db.datasets_infos.find({"user_id": ObjectId(current_user["_id"])}).sort("created_at", -1):
        items.append({
            "id": str(d["_id"]),
            "name": d.get("name"),
            "row_count": d.get("row_count"),
            "column_count": d.get("column_count"),
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

    # On ne joint l'analyse que si besoin (ici : on la retourne aussi)
    analysis = db.datasets_initial_analyze.find_one(
        {"dataset_id": ObjectId(dataset_id),
         "user_id": ObjectId(current_user["_id"])}
    )

    payload = {
        "id": str(info["_id"]),
        "name": info.get("name"),
        "filename": info.get("filename"),
        "status": info.get("status"),
        "row_count": info.get("row_count"),
        "column_count": info.get("column_count"),
        "hdfs_path": info.get("hdfs_path"),
        "error_message": info.get("error_message"),
        "created_at": info.get("created_at"),
        "updated_at": info.get("updated_at"),
    }
    if analysis:
        analysis["id"] = str(analysis["_id"])
        del analysis["_id"]
        payload["analysis"] = analysis

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
        "progress": progress,
        "error_message": info.get("error_message"),
        "updated_at": info.get("updated_at"),
    }
