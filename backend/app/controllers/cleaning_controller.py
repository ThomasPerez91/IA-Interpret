from __future__ import annotations

from typing import Any, Dict, List, Optional, Literal, Union
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson.objectid import ObjectId  # type: ignore
from bson.errors import InvalidId  # type: ignore

from .. import db
from .auth_controller import get_current_user

router = APIRouter(prefix="/cleaning", tags=["cleaning"])

# ====== Config collections ======
INFO_COLLECTION = "datasets_infos"
# ta collection d’analyse peut avoir bougé / été renommée
ANALYZE_CANDIDATES = [
    "datasets_initial_analyze",
    "datasets__analyze",
    "datasets_analyze",
]

PLAN_COLLECTION = "cleaning_plans"

# ---------- TYPES API ----------

ImputeMethod = Literal[
    "drop_row",
    "random_from_existing",
    "median",
    "mean",
    "mode",
    "value",
    "min",
    "max",
    "random_between_min_max",
]


class ColumnImputation(BaseModel):
    method: ImputeMethod
    value: Optional[Union[int, float, str]] = None


class ColumnPlan(BaseModel):
    name: str
    rename_to: str
    dtype: str
    drop: bool = False
    imputation: Optional[ColumnImputation] = None


class CleaningPlan(BaseModel):
    dataset_id: str
    columns: List[ColumnPlan]

# ---------- HELPERS ----------


def _as_oid_or_none(x: Any) -> Optional[ObjectId]:
    if isinstance(x, ObjectId):
        return x
    if isinstance(x, str):
        try:
            return ObjectId(x)
        except InvalidId:
            return None
    return None


def _same_id(a: Any, b: Any) -> bool:
    if isinstance(a, ObjectId):
        a = str(a)
    if isinstance(b, ObjectId):
        b = str(b)
    return str(a) == str(b)


def _find_one(coll: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if coll not in db.list_collection_names():
        return None
    return db[coll].find_one(query)


def _resolve_info_oid(dataset_id_raw: str, user_oid: ObjectId) -> ObjectId:
    """
    Résout l'_id du dataset dans **datasets_infos** en acceptant:
      - un _id (str/ObjectId) d'un doc de datasets_infos,
      - un dataset_id sauvegardé ailleurs (option future).
    Vérifie l'appartenance user_id.
    """
    oid = _as_oid_or_none(dataset_id_raw)
    # 1) essai direct par _id (str/oid)
    for key in ("_id",):
        doc = _find_one(INFO_COLLECTION, {key: oid or dataset_id_raw})
        if doc and _same_id(doc.get("user_id"), user_oid):
            return doc["_id"]

    # 2) essai sur un champ dataset_id éventuel (si tu le stockes aussi)
    doc = _find_one(INFO_COLLECTION, {
        "$or": [
            {"dataset_id": dataset_id_raw},
            {"dataset_id": oid},
        ]
    })
    if doc and _same_id(doc.get("user_id"), user_oid):
        return doc["_id"]

    raise HTTPException(status_code=404, detail="Dataset introuvable")


def _pick_analyze_collection() -> Optional[str]:
    for name in ANALYZE_CANDIDATES:
        if name in db.list_collection_names():
            return name
    return None


def _plan_from_saved(doc: Dict[str, Any], info_oid: ObjectId) -> CleaningPlan:
    cols: List[ColumnPlan] = []
    for c in doc.get("columns", []):
        imp = c.get("imputation")
        cols.append(
            ColumnPlan(
                name=c.get("name"),
                rename_to=c.get("rename_to", c.get("name")),
                dtype=c.get("dtype", "string"),
                drop=bool(c.get("drop", False)),
                imputation=(ColumnImputation(**imp) if imp else None),
            )
        )
    return CleaningPlan(dataset_id=str(info_oid), columns=cols)


def _default_plan_from_analysis(analysis: Dict[str, Any], info_oid: ObjectId) -> CleaningPlan:
    schema = analysis.get("schema", [])  # [{name, dtype}]
    cols: List[ColumnPlan] = []
    for f in schema:
        name = f.get("name")
        dtype = f.get("dtype") or f.get("type") or "string"
        if not name:
            continue
        cols.append(
            ColumnPlan(
                name=name,
                rename_to=name,
                dtype=dtype,
                drop=False,
                imputation=None,
            )
        )
    return CleaningPlan(dataset_id=str(info_oid), columns=cols)

# ---------- ROUTES ----------


@router.get("/{dataset_id}/plan", response_model=CleaningPlan)
def get_cleaning_plan(dataset_id: str, current_user: dict = Depends(get_current_user)):
    """
    Renvoie le plan de nettoyage pour le dataset (doc de `datasets_infos`):
      1) si `cleaning_plans` existe -> renvoyer
      2) sinon, plan par défaut basé sur `schema` de l’analyse initiale
         (collection tolérante: datasets_initial_analyze / datasets__analyze / datasets_analyze)
    """
    user_oid = ObjectId(current_user["_id"])
    info_oid = _resolve_info_oid(dataset_id, user_oid)

    # 1) Plan existant ?
    saved = _find_one(PLAN_COLLECTION, {"dataset_id": {
                      "$in": [info_oid, str(info_oid)]}})
    if saved:
        return _plan_from_saved(saved, info_oid)

    # 2) Analyse initiale -> plan par défaut
    analyze_coll = _pick_analyze_collection()
    if analyze_coll:
        analysis = _find_one(analyze_coll, {"dataset_id": {
                             "$in": [info_oid, str(info_oid)]}})
        if analysis:
            return _default_plan_from_analysis(dict(analysis), info_oid)

    # 3) Sinon: aucun plan/aucune analyse -> retourne plan vide
    return CleaningPlan(dataset_id=str(info_oid), columns=[])


@router.post("/{dataset_id}/plan", response_model=dict)
def save_cleaning_plan(payload: CleaningPlan, dataset_id: str, current_user: dict = Depends(get_current_user)):
    """
    Sauvegarde idempotente d’un plan dans `cleaning_plans`,
    avec dataset_id = _id du doc `datasets_infos`.
    """
    user_oid = ObjectId(current_user["_id"])
    info_oid = _resolve_info_oid(dataset_id, user_oid)

    cols: List[Dict[str, Any]] = []
    for c in payload.columns:
        cols.append({
            "name": c.name,
            "rename_to": c.rename_to or c.name,
            "dtype": c.dtype or "string",
            "drop": bool(c.drop),
            "imputation": (c.imputation.dict() if c.imputation else None),
        })

    if PLAN_COLLECTION not in db.list_collection_names():
        db.create_collection(PLAN_COLLECTION)

    db[PLAN_COLLECTION].update_one(
        {"dataset_id": {"$in": [info_oid, str(info_oid)]}},
        {"$set": {
            "dataset_id": info_oid,   # stocké en ObjectId
            "user_id": user_oid,
            "columns": cols
        }},
        upsert=True,
    )
    return {"ok": True}
