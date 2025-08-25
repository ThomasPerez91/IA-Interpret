from hdfs import InsecureClient  # type: ignore
from ..config import settings


def _base_url() -> str:
    return f"http://{settings.hadoop_host}:{settings.hadoop_port}"


def get_hdfs_client():
    """Client WebHDFS avec l'utilisateur applicatif (par défaut 'hdfs')."""
    return InsecureClient(_base_url(), user=settings.hdfs_user)


def get_hdfs_client_as(user: str):
    """Client WebHDFS en forçant un utilisateur (ex: 'root' pour l'init)."""
    return InsecureClient(_base_url(), user=user)
