from hdfs.util import HdfsError  # type: ignore
from .hdfs_client import get_hdfs_client_as
from ..config import settings


def ensure_hdfs_base_dir(force: bool = False):
    """
    Crée/normalise le répertoire base sur HDFS :
      - /user_datasets
      - owner=hdfs, group=supergroup
      - perms=777
    Idempotent.
    """
    base = settings.hdfs_base_dir
    admin = get_hdfs_client_as(settings.hdfs_admin_user)

    try:
        admin.makedirs(base, permission=777)  # ⚠️ passer 777 (pas 0o777)
    except HdfsError as e:
        if "File exists" not in str(e) and not force:
            raise

    # (ré)applique owner/perms
    try:
        admin.set_owner(base, owner=settings.hdfs_user, group="supergroup")
    except Exception:
        pass
    try:
        admin.set_permission(base, permission=777)  # drwxrwxrwx
    except Exception:
        pass
