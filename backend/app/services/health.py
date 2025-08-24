import socket
from redis import Redis  # type: ignore
from pymongo.errors import PyMongoError  # type: ignore
from ..celery_app import celery_app
from ..config import settings
from .. import db, mongo_client


def check_health() -> dict:
    status: dict[str, str] = {}

    # --- Mongo ---
    try:
        mongo_client.admin.command("ping")  # plus sûr que db.command("ping")
        status["mongo"] = "ok"
    except PyMongoError as e:
        status["mongo"] = f"error: {str(e)}"
    except Exception as e:
        status["mongo"] = f"error: {str(e)}"

    # --- Redis ---
    try:
        r = Redis.from_url(settings.redis_url)
        r.ping()
        status["redis"] = "ok"
    except Exception as e:
        status["redis"] = f"error: {str(e)}"

    # --- Celery ---
    try:
        res = celery_app.control.ping(timeout=1.0, limit=1)
        status["celery"] = "ok" if res else "error: no response"
    except Exception as e:
        status["celery"] = f"error: {str(e)}"

    # --- Flower ---
    try:
        with socket.create_connection(
            (settings.flower_host, settings.flower_port), timeout=2
        ):
            status["flower"] = "ok"
    except Exception as e:
        status["flower"] = f"error: {str(e)}"

    # --- Spark ---
    try:
        with socket.create_connection(
            (settings.spark_host, settings.spark_port), timeout=2
        ):
            status["spark"] = "ok"
    except Exception as e:
        status["spark"] = f"error: {str(e)}"

    # --- Hadoop ---
    try:
        with socket.create_connection(
            (settings.hadoop_host, settings.hadoop_port), timeout=2
        ):
            status["hadoop"] = "ok"
    except Exception as e:
        status["hadoop"] = f"error: {str(e)}"

    # --- Global ---
    overall = "ok" if all(v == "ok" for v in status.values()) else "degraded"
    return {"status": overall, "services": status}
