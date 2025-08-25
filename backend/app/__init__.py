from pymongo import MongoClient  # type: ignore
from .config import settings


def _build_fallback_uri() -> str:
    if not (settings.mongo_user and settings.mongo_password and settings.mongo_db_name):
        raise RuntimeError(
            "Mongo credentials missing and MONGO_URI not provided")
    return (
        f"mongodb://{settings.mongo_user}:{settings.mongo_password}"
        f"@{settings.mongo_host}:{settings.mongo_port}/{settings.mongo_db_name}"
        f"?authSource=admin"
    )


URI = settings.mongo_uri or _build_fallback_uri()
mongo_client = MongoClient(URI)

# Préférence: base explicitement nommée, sinon default de l'URI
if settings.mongo_db_name:
    db = mongo_client[settings.mongo_db_name]
else:
    db = mongo_client.get_default_database()
