"""Application configuration, loaded from environment variables (.env).

Single source of truth for settings shared across the FastAPI app, Alembic
migrations, and Celery workers.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    APP_NAME: str = "anku"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # --- Database ---
    DATABASE_URL: str = "postgresql+asyncpg://anku:anku@localhost:5432/anku"

    # --- Cache / broker ---
    REDIS_URL: str = "redis://localhost:6379/0"

    # --- Auth ---
    JWT_SECRET: str = "change-me-to-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # --- AI providers (consumed by ai/gateway.py via LiteLLM) ---
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""

    # --- Integrations ---
    GITHUB_TOKEN: str = ""
    VERCEL_TOKEN: str = ""
    RAILWAY_TOKEN: str = ""

    # --- Runtime ---
    PROJECTS_ROOT: str = "./projects_root"

    # --- CORS ---
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
