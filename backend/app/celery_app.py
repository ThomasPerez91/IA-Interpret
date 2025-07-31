import os
from celery import Celery

celery_app = Celery(__name__)
celery_app.conf.broker_url = os.getenv("REDIS_URL", "redis://ia_redis:6379/0")
celery_app.conf.result_backend = os.getenv("REDIS_URL", "redis://ia_redis:6379/0")
