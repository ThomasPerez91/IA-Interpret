from .services.hdfs_setup import ensure_hdfs_base_dir
from fastapi import FastAPI  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from .services.health import check_health
from .controllers.users_controller import router as users_router
from .controllers.auth_controller import router as auth_router
from .controllers.datasets_controller import router as datasets_router

from .config import settings
from . import db

app = FastAPI(
    title="AI Interpret API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Index Mongo


@app.on_event("startup")
def ensure_indexes():
    try:
        ensure_hdfs_base_dir()
    except Exception as e:
        # on log seulement; en dev on préfère ne pas bloquer le démarrage de l'API
        print(f"[WARN] HDFS base dir init failed: {e}")

    db.users.create_index("email", unique=True)
    db.datasets_infos.create_index([("user_id", 1), ("created_at", -1)])
    db.datasets_initial_analyze.create_index([("dataset_id", 1)], unique=True)


@app.get("/health", tags=["system"])
def health():
    return check_health()


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(datasets_router)
