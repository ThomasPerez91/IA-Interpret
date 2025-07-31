from fastapi import FastAPI
import os
import socket
import subprocess
from pymongo import MongoClient
from redis import Redis
from celery import Celery
from .celery_app import celery_app

app = FastAPI()

@app.get("/health")
def health():
    status = {}
    # Mongo
    try:
        uri = os.getenv("MONGO_URI", "mongodb://ia_mongo:27017/")
        client = MongoClient(uri, serverSelectionTimeoutMS=2000)
        client.admin.command('ping')
        status["mongo"] = "ok"
    except Exception:
        status["mongo"] = "error"
    # Redis
    try:
        redis_url = os.getenv("REDIS_URL", "redis://ia_redis:6379/0")
        r = Redis.from_url(redis_url)
        r.ping()
        status["redis"] = "ok"
    except Exception:
        status["redis"] = "error"
    # Celery
    try:
        celery_app.control.ping(timeout=1)
        status["celery"] = "ok"
    except Exception:
        status["celery"] = "error"
    # Flower
    try:
        flower_host = os.getenv("FLOWER_HOST", "ia_flower")
        flower_port = int(os.getenv("FLOWER_PORT", 5555))
        with socket.create_connection((flower_host, flower_port), timeout=2):
            status["flower"] = "ok"
    except Exception:
        status["flower"] = "error"
    # Spark
    try:
        subprocess.run(["spark-submit", "--version"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        status["spark"] = "ok"
    except Exception:
        status["spark"] = "error"
    # Hadoop
    try:
        subprocess.run(["hadoop", "version"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        status["hadoop"] = "ok"
    except Exception:
        status["hadoop"] = "error"
    return status
