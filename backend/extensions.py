"""Shared Flask extensions initialized in server.py."""

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate

from config import SETTINGS

migrate = Migrate()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    storage_uri=SETTINGS["RATELIMIT_STORAGE_URI"],
)
