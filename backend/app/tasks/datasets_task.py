from __future__ import annotations
import os
from datetime import datetime
from typing import Any, Dict
from bson import ObjectId  # type: ignore
from hdfs.util import HdfsError  # type: ignore
from pymongo import MongoClient  # type: ignore
from ..celery_app import celery_app
from ..services.hdfs_client import get_hdfs_client, get_hdfs_client_as
from ..services.spark.spark_analyze import analyze_csv_local
from ..config import settings


def _db():
    """
    Crée un MongoClient *par appel* (fork-safe pour Celery).
    """
    cli = MongoClient(settings.mongo_uri)
    return cli.get_default_database()


def _update_status(dataset_oid: ObjectId, status: str, extra: Dict[str, Any] | None = None) -> None:
    data: Dict[str, Any] = {"status": status, "updated_at": datetime.utcnow()}
    if extra:
        data.update(extra)
    _db().datasets_infos.update_one({"_id": dataset_oid}, {"$set": data})


@celery_app.task(name="datasets.process_csv")
def process_csv_task(dataset_id: str, user_id: str, local_path: str, filename: str) -> Dict[str, Any]:
    """
    Pipeline:
      1) Crée le dossier HDFS /user_datasets/<user_id>/<dataset_id> (avec fallback admin si besoin)
      2) Upload le CSV vers HDFS (raw.csv)
      3) Analyse locale via PySpark (schema, nulls, types, etc.)
      4) Enregistre l'analyse détaillée dans 'datasets_initial_analyze'
      5) Met à jour 'datasets_infos' (row_count, column_count, status=done)
    """
    dataset_oid = ObjectId(dataset_id)
    user_oid = ObjectId(user_id)

    try:
        _update_status(dataset_oid, "uploading_hdfs")

        # --- 1) Prépare chemins HDFS
        hdfs_dir = f"{settings.hdfs_base_dir}/{user_id}/{dataset_id}"
        hdfs_file = f"{hdfs_dir}/raw.csv"

        # Client applicatif (user = hdfs par défaut)
        user_client = get_hdfs_client()

        # Tente la création en user applicatif
        try:
            user_client.makedirs(hdfs_dir)
        except HdfsError as e:
            # Fallback: corrige les droits avec l'admin (root)
            if "Permission denied" in str(e):
                admin = get_hdfs_client_as(settings.hdfs_admin_user)

                # S'assure que le répertoire base existe et a des droits larges
                try:
                    admin.makedirs(settings.hdfs_base_dir,
                                   permission=777)  # drwxrwxrwx
                except HdfsError as ie:
                    if "File exists" not in str(ie):
                        raise

                # Normalise owner/perms sur la base
                try:
                    admin.set_owner(settings.hdfs_base_dir,
                                    owner=settings.hdfs_user, group="supergroup")
                except Exception:
                    pass
                try:
                    admin.set_permission(
                        settings.hdfs_base_dir, permission=777)
                except Exception:
                    pass

                # Crée le sous-dossier cible avec admin, puis remet owner/perms
                admin.makedirs(hdfs_dir, permission=775)  # drwxrwxr-x
                try:
                    admin.set_owner(
                        hdfs_dir, owner=settings.hdfs_user, group="supergroup")
                except Exception:
                    pass
                try:
                    admin.set_permission(hdfs_dir, permission=775)
                except Exception:
                    pass
            else:
                raise

        # --- 2) Upload du fichier vers HDFS
        with open(local_path, "rb") as f:
            user_client.write(hdfs_file, f, overwrite=True)

        _update_status(dataset_oid, "analyzing", {"hdfs_path": hdfs_file})

        # --- 3) Analyse Spark locale
        analysis = analyze_csv_local(local_path)
        # analysis contient au minimum:
        #   row_count, column_count, schema, null_counts, bad_type_counts,
        #   distinct_counts, constant_columns, suggestions

        # --- 4) Enregistrement résultats détaillés
        analysis_doc: Dict[str, Any] = {
            "dataset_id": dataset_oid,
            "user_id": user_oid,
            "generated_at": datetime.utcnow(),
            "hdfs_path": hdfs_file,
            **analysis,
        }
        _db().datasets_initial_analyze.insert_one(analysis_doc)

        # --- 5) MAJ dataset_infos
        _update_status(
            dataset_oid,
            "done",
            {
                "row_count": analysis.get("row_count"),
                "column_count": analysis.get("column_count"),
            },
        )

        return {"dataset_id": dataset_id, "hdfs_path": hdfs_file, **analysis}

    except Exception as e:
        # En cas d'erreur on passe en failed + message
        _update_status(dataset_oid, "failed", {"error_message": str(e)})
        raise
    finally:
        # Nettoyage fichier temporaire
        try:
            os.remove(local_path)
        except Exception:
            pass
