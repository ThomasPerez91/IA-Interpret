from fastapi import FastAPI  # type: ignore
from starlette.middleware.sessions import SessionMiddleware

from .services.health import check_health
from .controllers.users_controller import router as users_router
from .controllers.auth_controller import router as auth_router
from .config import settings

app = FastAPI(title="Ai Interpret API", version="1.0.0")
app.add_middleware(SessionMiddleware, secret_key=settings.jwt_secret)


@app.get("/health")
def health():
    return check_health()


app.include_router(users_router)
app.include_router(auth_router)
