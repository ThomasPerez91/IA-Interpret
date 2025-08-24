from fastapi import FastAPI  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from .services.health import check_health
from .controllers.users_controller import router as users_router
from .controllers.auth_controller import router as auth_router
from .config import settings

app = FastAPI(
    title="AI Interpret API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# --- Middlewares ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,  # list depuis .env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routes ---


@app.get("/health", tags=["system"])
def health():
    return check_health()


app.include_router(auth_router)
app.include_router(users_router)
