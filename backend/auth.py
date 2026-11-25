"""JWT authentication blueprint and route protection decorator."""

from datetime import datetime, timedelta, timezone
from functools import wraps
import os
import re
import jwt
from flask import Blueprint, g, jsonify, request
from sqlalchemy.exc import IntegrityError

from config import SETTINGS
from extensions import limiter
from models import User, db

JWT_SECRET = SETTINGS["JWT_SECRET"]
AUTH_RATE_LIMIT = SETTINGS["AUTH_RATE_LIMIT"]

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _create_token(user: User) -> str:
    """Create a signed HS256 JWT with 24h expiry and string subject."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def login_required(fn):
    """Protect a route by verifying the Bearer JWT and populating g.user."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header[len("Bearer "):].strip()
        if not token:
            return jsonify({"error": "Missing authentication token"}), 401

        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = int(payload["sub"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
            return jsonify({"error": "Invalid authentication token"}), 401

        user = db.session.get(User, user_id)
        if user is None:
            return jsonify({"error": "Invalid authentication token"}), 401

        g.user = user
        return fn(*args, **kwargs)

    return wrapper


@auth_bp.route("/signup", methods=["POST"])
@limiter.limit(AUTH_RATE_LIMIT)
def signup():
    """Register a new user account and return a JWT."""
    data = request.get_json(silent=True) or {}
    raw_email = data.get("email")
    password = data.get("password")

    email = raw_email.strip().lower() if isinstance(raw_email, str) else ""
    if not EMAIL_RE.match(email):
        return jsonify({"error": "Please enter a valid email address"}), 400

    if not isinstance(password, str) or len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if User.query.filter_by(email=email).first() is not None:
        return jsonify({"error": "Email already registered"}), 409

    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Email already registered"}), 409

    return jsonify({"token": _create_token(user), "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
@limiter.limit(AUTH_RATE_LIMIT)
def login():
    """Authenticate an existing user and return a JWT."""
    data = request.get_json(silent=True) or {}
    raw_email = data.get("email")
    password = data.get("password")

    email = raw_email.strip().lower() if isinstance(raw_email, str) else ""
    user = User.query.filter_by(email=email).first() if email else None

    if not user or not isinstance(password, str) or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({"token": _create_token(user), "user": user.to_dict()}), 200


@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    """Return the currently authenticated user."""
    return jsonify({"user": g.user.to_dict()}), 200
