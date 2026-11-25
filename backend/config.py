"""Environment-driven configuration for development, staging, and production."""

import os
import secrets
import warnings
from dotenv import load_dotenv

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

ALLOWED_ENVS = ("development", "staging", "production")
PLACEHOLDER_SECRET = "replace-with-a-random-64-char-hex-secret"


def normalize_database_url(raw_url: str | None) -> str:
    """Normalize PostgreSQL URLs (postgres:// -> postgresql://) with SQLite fallback."""
    url = (raw_url or "").strip()
    if not url:
        return "sqlite:///momentum.db"
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://") :]
    return url


def parse_allowed_origins(raw_origins: str | None) -> list[str]:
    """Parse comma-separated CORS origins, defaulting to local Vite dev origins."""
    raw = (raw_origins or "").strip()
    if not raw:
        return ["http://localhost:5173", "http://127.0.0.1:5173"]
    return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]


def load_settings() -> dict:
    """Load and validate environment settings for the Flask application."""
    app_env = os.environ.get("APP_ENV", "development").strip().lower()
    if app_env not in ALLOWED_ENVS:
        raise RuntimeError(
            f"Invalid APP_ENV '{app_env}'. Must be one of: {', '.join(ALLOWED_ENVS)}."
        )

    jwt_secret = os.environ.get("JWT_SECRET", "").strip()
    if not jwt_secret or jwt_secret == PLACEHOLDER_SECRET:
        if app_env != "development":
            raise RuntimeError(
                f"JWT_SECRET environment variable must be set to a strong secret in {app_env}."
            )
        warnings.warn(
            "JWT_SECRET is missing; generating an ephemeral secret for development only.",
            RuntimeWarning,
            stacklevel=2,
        )
        jwt_secret = secrets.token_hex(32)

    database_url = normalize_database_url(os.environ.get("DATABASE_URL"))
    engine_options = (
        {"pool_pre_ping": True, "pool_recycle": 300}
        if database_url.startswith("postgresql://")
        else {}
    )

    return {
        "APP_ENV": app_env,
        "JWT_SECRET": jwt_secret,
        "DATABASE_URL": database_url,
        "SQLALCHEMY_ENGINE_OPTIONS": engine_options,
        "ALLOWED_ORIGINS": parse_allowed_origins(os.environ.get("ALLOWED_ORIGINS")),
        "RATELIMIT_STORAGE_URI": os.environ.get("RATELIMIT_STORAGE_URI", "memory://").strip(),
        "AUTH_RATE_LIMIT": os.environ.get("AUTH_RATE_LIMIT", "10 per minute").strip(),
    }


SETTINGS = load_settings()
