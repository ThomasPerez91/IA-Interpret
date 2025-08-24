from datetime import datetime, timedelta
import jwt  # type: ignore
from ..config import settings


def create_access_token(data: dict, expires_delta: int | None = None) -> str:
    """Crée un JWT signé contenant les infos user_id/email."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(
        seconds=expires_delta or settings.jwt_exp_delta_seconds
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret,
                             algorithms=[settings.jwt_algorithm])
        return payload
    except jwt.PyJWTError:
        return None
