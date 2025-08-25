from celery import Celery  # type: ignore
from .config import settings

celery_app = Celery(
    "ia_interpret",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.datasets_task"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    task_acks_late=True,
    worker_max_tasks_per_child=100,
)
