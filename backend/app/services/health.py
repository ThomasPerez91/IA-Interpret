import socket
from redis import Redis
from ..celery_app import celery_app
from ..config import settings
from .. import db


def check_health():
    status = {}

    try:
        db.command("ping")
        status["mongo"] = "ok"
    except Exception as e:
        status["mongo"] = f"error: {str(e)}"

    try:
        redis_url = settings.redis_url
        r = Redis.from_url(redis_url)
        r.ping()
        status["redis"] = "ok"
    except Exception as e:
        status["redis"] = f"error: {str(e)}"

    try:
        res = celery_app.control.ping(timeout=1.0)
        status["celery"] = "ok" if res else "error: no response"
    except Exception as e:
        status["celery"] = f"error: {str(e)}"

    try:
        flower_host = settings.flower_host
        flower_port = settings.flower_port
        with socket.create_connection((flower_host, flower_port), timeout=2):
            status["flower"] = "ok"
    except Exception as e:
        status["flower"] = f"error: {str(e)}"

    try:
        with socket.create_connection(("spark_master", 7077), timeout=2):
            status["spark"] = "ok"
    except Exception as e:
        status["spark"] = f"error: {str(e)}"

    try:
        with socket.create_connection(("hadoop-namenode", 9870), timeout=2):
            status["hadoop"] = "ok"
    except Exception as e:
        status["hadoop"] = f"error: {str(e)}"

    return status
