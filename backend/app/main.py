from fastapi import FastAPI  # type: ignore

from .services.health import check_health
from .controllers.users_controller import router as users_router

app = FastAPI(title="Ai Interpret API", version="1.0.0")


@app.get("/health")
def health():
    return check_health()


app.include_router(users_router)
