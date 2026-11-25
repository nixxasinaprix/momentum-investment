"""Tests for staging config, PostgreSQL URL normalization, health endpoint, caching, and rate limiting."""

import os
import sys

from flask import Flask, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import pytest

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-pytest-only-32bytes")

from auth import auth_bp  # noqa: E402
from config import load_settings, normalize_database_url, parse_allowed_origins  # noqa: E402
from models import Stock, db  # noqa: E402
from pipeline_routes import _PIPELINE_CACHE, pipeline_bp  # noqa: E402
from research_routes import _CACHE, research_bp  # noqa: E402


def test_database_url_normalization_and_cors_parsing():
    assert normalize_database_url(None) == "sqlite:///momentum.db"
    assert normalize_database_url("postgres://u:p@host:5432/db") == "postgresql://u:p@host:5432/db"
    assert normalize_database_url("postgresql://u:p@host:5432/db") == "postgresql://u:p@host:5432/db"

    assert parse_allowed_origins("https://app.vercel.app/, http://localhost:5173") == [
        "https://app.vercel.app",
        "http://localhost:5173",
    ]


def test_jwt_secret_required_outside_development(monkeypatch):
    monkeypatch.setenv("APP_ENV", "staging")
    monkeypatch.delenv("JWT_SECRET", raising=False)
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        load_settings()

    monkeypatch.setenv("JWT_SECRET", "replace-with-a-random-64-char-hex-secret")
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        load_settings()

    monkeypatch.setenv("JWT_SECRET", "a-real-staging-secret-value-at-least-32-chars")
    cfg = load_settings()
    assert cfg["APP_ENV"] == "staging"


def test_health_endpoint_and_auth_rate_limiting():
    from server import app as main_app

    # Verify /api/health works on a clean in-memory Flask app mirroring server.py
    test_app = Flask(__name__)
    test_app.config["TESTING"] = True
    test_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    test_app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    test_limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[],
        storage_uri="memory://",
    )

    @test_app.errorhandler(429)
    def _429(_err):
        return jsonify({"error": "Too many requests. Please try again later."}), 429

    db.init_app(test_app)
    test_limiter.init_app(test_app)
    test_app.register_blueprint(auth_bp)
    test_app.register_blueprint(research_bp)
    test_app.register_blueprint(pipeline_bp)

    # Register /api/health view from server
    test_app.add_url_rule("/api/health", view_func=main_app.view_functions["health"])

    @test_app.route("/api/test-limit", methods=["POST"])
    @test_limiter.limit("3 per minute")
    def _limited():
        return jsonify({"ok": True}), 200

    with test_app.app_context():
        db.create_all()
        client = test_app.test_client()

        health_res = client.get("/api/health")
        assert health_res.status_code == 200
        hdata = health_res.get_json()
        assert hdata["status"] == "ok"
        assert hdata["database"] == "connected"
        assert "latest_price_date" in hdata

        # Verify rate limiting triggers 429 cleanly
        for _ in range(3):
            assert client.post("/api/test-limit").status_code == 200
        r429 = client.post("/api/test-limit")
        assert r429.status_code == 429
        assert "Too many requests" in r429.get_json()["error"]

        db.session.remove()
        db.drop_all()
        _CACHE.clear()
        _PIPELINE_CACHE.clear()
