"""Tests for market data models, idempotent price upserts, and protected routes."""

from datetime import date
import os
import sys

from flask import Flask
import pytest

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-pytest-only-32bytes")

from auth import auth_bp  # noqa: E402
from market_routes import market_bp  # noqa: E402
from models import Price, Stock, User, db  # noqa: E402
from scripts.ingest_prices import upsert_prices  # noqa: E402


@pytest.fixture()
def app():
    test_app = Flask(__name__)
    test_app.config["TESTING"] = True
    test_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    test_app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(test_app)
    test_app.register_blueprint(auth_bp)
    test_app.register_blueprint(market_bp)

    with test_app.app_context():
        db.create_all()
        yield test_app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def _auth_header(client, email="tester@example.com", password="password123"):
    res = client.post(
        "/api/auth/signup",
        json={"email": email, "password": password},
    )
    token = res.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_upsert_prices_is_idempotent(app):
    with app.app_context():
        stock = Stock(symbol="RELIANCE.NS", name="Reliance Industries Ltd.", sector="Oil Gas")
        db.session.add(stock)
        db.session.commit()

        sample_bars = [
            {
                "date": date(2025, 1, 2),
                "open": 1200.0,
                "high": 1220.0,
                "low": 1195.0,
                "close": 1215.0,
                "volume": 1000000,
            },
            {
                "date": date(2025, 1, 3),
                "open": 1215.0,
                "high": 1230.0,
                "low": 1210.0,
                "close": 1225.0,
                "volume": 1200000,
            },
        ]

        first_inserted = upsert_prices(stock.id, sample_bars)
        assert first_inserted == 2
        assert Price.query.filter_by(stock_id=stock.id).count() == 2

        updated_bars = [
            {**sample_bars[0], "close": 1216.5},
            sample_bars[1],
        ]
        second_inserted = upsert_prices(stock.id, updated_bars)
        assert second_inserted == 0
        assert Price.query.filter_by(stock_id=stock.id).count() == 2

        updated_row = Price.query.filter_by(
            stock_id=stock.id, date=date(2025, 1, 2)
        ).one()
        assert updated_row.close == 1216.5


def test_market_endpoints_require_auth(client):
    assert client.get("/api/stocks").status_code == 401
    assert client.get("/api/prices/RELIANCE.NS").status_code == 401


def test_prices_unknown_symbol_returns_404(app, client):
    headers = _auth_header(client)
    res = client.get("/api/prices/UNKNOWN.NS", headers=headers)
    assert res.status_code == 404


def test_stocks_and_prices_return_data_for_authenticated_user(app, client):
    with app.app_context():
        stock = Stock(symbol="RELIANCE.NS", name="Reliance Industries Ltd.", sector="Energy")
        inactive = Stock(symbol="OLD.NS", name="Old Co", sector="Other", is_active=False)
        db.session.add_all([stock, inactive])
        db.session.commit()

        upsert_prices(
            stock.id,
            [
                {
                    "date": date(2025, 1, 3),
                    "open": 1215.0,
                    "high": 1230.0,
                    "low": 1210.0,
                    "close": 1225.0,
                    "volume": 1200000,
                },
                {
                    "date": date(2025, 1, 2),
                    "open": 1200.0,
                    "high": 1220.0,
                    "low": 1195.0,
                    "close": 1215.0,
                    "volume": 1000000,
                },
            ],
        )

    headers = _auth_header(client)

    stocks_res = client.get("/api/stocks", headers=headers)
    assert stocks_res.status_code == 200
    assert stocks_res.get_json()["stocks"] == [
        {"symbol": "RELIANCE.NS", "name": "Reliance Industries Ltd.", "sector": "Energy"}
    ]

    prices_res = client.get(
        "/api/prices/RELIANCE.NS?from=2025-01-01&to=2025-01-10",
        headers=headers,
    )
    assert prices_res.status_code == 200
    bars = prices_res.get_json()["prices"]
    assert [b["date"] for b in bars] == ["2025-01-02", "2025-01-03"]
