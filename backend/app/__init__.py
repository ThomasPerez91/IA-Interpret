from pymongo import MongoClient  # type: ignore
from .config import settings

mongo_client = MongoClient(settings.mongo_uri)
db = mongo_client.get_default_database()
