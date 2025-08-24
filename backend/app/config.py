# backend/app/config.py
from __future__ import annotations

from typing import List
from pydantic import Field, field_validator  # type: ignore
from pydantic_settings import BaseSettings, SettingsConfigDict  # type: ignore


class Settings(BaseSettings):
    """
    Configuration de l'application (FastAPI, Celery, DB, etc.)
    Les valeurs peuvent être chargées depuis .env et backend/.env (dans cet ordre).
    """

    # -------------------------
    # MongoDB (init containers)
    # -------------------------
    # Variables utilisées par le container mongo à l'initialisation (non requises côté app)
    mongo_initdb_root_username: str | None = Field(
        default=None, env="MONGO_INITDB_ROOT_USERNAME"
    )
    mongo_initdb_root_password: str | None = Field(
        default=None, env="MONGO_INITDB_ROOT_PASSWORD"
    )
    mongo_initdb_database: str | None = Field(
        default=None, env="MONGO_INITDB_DATABASE"
    )

    # -------------------------
    # MongoDB (application)
    # -------------------------
    mongo_user: str | None = Field(default=None, env="MONGO_USER")
    mongo_password: str | None = Field(default=None, env="MONGO_PASSWORD")
    mongo_db_name: str | None = Field(default=None, env="MONGO_DB_NAME")
    mongo_host: str = Field(default="ia_mongo", env="MONGO_HOST")
    mongo_port: int = Field(default=27017, env="MONGO_PORT")

    # Si présent, on l'utilise tel quel ; sinon on le construit avec user/pass/host/port/db
    mongo_uri: str | None = Field(default=None, env="MONGO_URI")

    # -------------------------
    # Redis / Celery / Flower
    # -------------------------
    redis_url: str = Field(default="redis://ia_redis:6379/0", env="REDIS_URL")

    flower_user: str | None = Field(default=None, env="FLOWER_USER")
    flower_password: str | None = Field(default=None, env="FLOWER_PASSWORD")
    flower_host: str = Field(default="ia_flower", env="FLOWER_HOST")
    flower_port: int = Field(default=5555, env="FLOWER_PORT")

    # -------------------------
    # Frontend (utile si backend doit générer des liens vers le front)
    # -------------------------
    vite_api_url: str | None = Field(default=None, env="VITE_API_URL")

    # -------------------------
    # Auth
    # -------------------------
    jwt_secret: str = Field(..., env="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    jwt_exp_delta_seconds: int = Field(
        default=3600, env="JWT_EXP_DELTA_SECONDS")

    # Clé de session distincte (ne pas réutiliser JWT_SECRET)
    session_secret: str = Field(
        default="dev-session-secret", env="SESSION_SECRET")

    # -------------------------
    # CORS
    # -------------------------
    # Liste séparée par des virgules, ex: "http://localhost:5173,http://localhost:8081"
    cors_origins_csv: str = Field(
        default="http://localhost:5173,http://localhost:8081", env="CORS_ORIGINS"
    )

    # -------------------------
    # Spark / Hadoop (UI/ports)
    # -------------------------
    spark_host: str = Field(default="spark_master", env="SPARK_HOST")
    spark_port: int = Field(default=7077, env="SPARK_PORT")

    hadoop_host: str = Field(default="hadoop-namenode", env="HADOOP_HOST")
    hadoop_port: int = Field(default=9870, env="HADOOP_PORT")

    # -------------------------
    # Pydantic Settings config
    # -------------------------
    model_config = SettingsConfigDict(
        env_file=(".env", "./backend/.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # -------------------------
    # Validators / helpers
    # -------------------------
    @field_validator("mongo_uri", mode="before")
    @classmethod
    def build_mongo_uri_if_missing(cls, v: str | None, values: dict) -> str | None:
        """
        Si MONGO_URI n'est pas fourni, on le construit à partir des composants.
        - Si user/pass/db manquent, on laisse None (l'app lèvera une erreur au moment d'ouvrir la connexion).
        """
        if v:
            return v

        user = values.get("mongo_user")
        pwd = values.get("mongo_password")
        host = values.get("mongo_host", "ia_mongo")
        port = values.get("mongo_port", 27017)
        dbname = values.get("mongo_db_name")

        if user and pwd and dbname:
            return f"mongodb://{user}:{pwd}@{host}:{port}/{dbname}?authSource=admin"
        # Sinon, pas assez d'infos pour construire proprement
        return None

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.cors_origins_csv.split(",") if o.strip()]


settings = Settings()
