# backend/app/config.py
from pydantic_settings import BaseSettings  # type: ignore
from pydantic import Field  # type: ignore


class Settings(BaseSettings):
    # MongoDB (initdb et accès application)
    mongo_initdb_root_username: str = Field(...,
                                            env="MONGO_INITDB_ROOT_USERNAME")
    mongo_initdb_root_password: str = Field(...,
                                            env="MONGO_INITDB_ROOT_PASSWORD")
    mongo_initdb_database: str = Field(..., env="MONGO_INITDB_DATABASE")

    mongo_user: str = Field(..., env="MONGO_USER")
    mongo_password: str = Field(..., env="MONGO_PASSWORD")
    mongo_db_name: str = Field(..., env="MONGO_DB_NAME")
    mongo_uri: str = Field(..., env="MONGO_URI")

    # Redis / Celery
    redis_url: str = Field(..., env="REDIS_URL")

    # Flower
    flower_user: str = Field(..., env="FLOWER_USER")
    flower_password: str = Field(..., env="FLOWER_PASSWORD")
    flower_host: str = Field("ia_flower", env="FLOWER_HOST")
    flower_port: int = Field(5555, env="FLOWER_PORT")

    # Front-end
    vite_api_url: str = Field(..., env="VITE_API_URL")

    # JWT Auth
    jwt_secret: str = Field(..., env="JWT_SECRET")
    jwt_algorithm: str = Field("HS256", env="JWT_ALGORITHM")
    jwt_exp_delta_seconds: int = Field(3600,  env="JWT_EXP_DELTA_SECONDS")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
