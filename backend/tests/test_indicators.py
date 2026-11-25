"""Tests for technical indicators, trend labels, and research endpoints."""

import os
import sys

from flask import Flask
import numpy as np
import pandas as pd
import pytest

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-pytest-only-32bytes")

from auth import auth_bp  # noqa: E402
from indicators import (  # noqa: E402
    TREND_DOWNTREND,
    TREND_INSUFFICIENT,
    TREND_PULLBACK,
    TREND_STRONG_UPTREND,
    TREND_WEAKENING,
    classify_trend,
    classify_trend_series,
    compute_52w_high_low,
    compute_relative_strength,
    compute_rsi,
    compute_sma,
)
from models import Stock, db  # noqa: E402
from research_routes import _CACHE, research_bp  # noqa: E402
from scripts.ingest_benchmark import upsert_benchmark_prices  # noqa: E402
from scripts.ingest_prices import upsert_prices  # noqa: E402


@pytest.fixture()
def app():
    _CACHE.clear()
    test_app = Flask(__name__)
    test_app.config["TESTING"] = True
    test_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    test_app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(test_app)
    test_app.register_blueprint(auth_bp)
    test_app.register_blueprint(research_bp)

    with test_app.app_context():
        db.create_all()
        yield test_app
        db.session.remove()
        db.drop_all()
        _CACHE.clear()


@pytest.fixture()
def client(app):
    return app.test_client()


def _auth_header(client, email="ind@example.com", password="password123"):
    res = client.post(
        "/api/auth/signup",
        json={"email": email, "password": password},
    )
    token = res.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_sma_and_rsi_values():
    dates = pd.bdate_range("2025-01-01", periods=30)
    rising = pd.Series(np.arange(1.0, 31.0), index=dates)

    sma20 = compute_sma(rising, 20)
    assert pd.isna(sma20.iloc[18])
    assert np.isclose(sma20.iloc[19], 10.5)
    assert np.isclose(sma20.iloc[-1], 20.5)

    rsi_rising = compute_rsi(rising, period=14)
    assert np.isclose(rsi_rising.iloc[-1], 100.0)

    falling = pd.Series(np.arange(100.0, 70.0, -1.0), index=dates)
    rsi_falling = compute_rsi(falling, period=14)
    assert np.isclose(rsi_falling.iloc[-1], 0.0)


def test_52w_high_low_and_relative_strength():
    dates = pd.bdate_range("2025-01-01", periods=10)
    stock = pd.Series([100, 120, 110, 90, 80, 100, 110, 120, 108, 96], index=dates, dtype=float)
    bench = pd.Series([1000] * 10, index=dates, dtype=float)

    hl = compute_52w_high_low(stock, window=252)
    assert hl["high_52w"] == 120.0
    assert hl["low_52w"] == 80.0
    # 96 is 20% below 120
    assert np.isclose(hl["pct_below_52w_high"], 20.0)

    rs = compute_relative_strength(stock, bench)
    assert np.isclose(rs.iloc[0], 100.0)
    assert np.isclose(rs.iloc[1], 120.0)
    assert np.isclose(rs.iloc[-1], 96.0)


def test_trend_classification_rules():
    assert classify_trend(120.0, 110.0, 100.0) == TREND_STRONG_UPTREND
    assert classify_trend(105.0, 110.0, 100.0) == TREND_PULLBACK
    assert classify_trend(95.0, 110.0, 100.0) == TREND_WEAKENING
    assert classify_trend(85.0, 95.0, 100.0) == TREND_DOWNTREND
    assert classify_trend(100.0, None, 90.0) == TREND_INSUFFICIENT

    p = pd.Series([120.0, 105.0, 95.0, 85.0, 100.0])
    s50 = pd.Series([110.0, 110.0, 110.0, 95.0, np.nan])
    s200 = pd.Series([100.0, 100.0, 100.0, 100.0, 90.0])
    res = classify_trend_series(p, s50, s200)
    assert res.tolist() == [
        TREND_STRONG_UPTREND,
        TREND_PULLBACK,
        TREND_WEAKENING,
        TREND_DOWNTREND,
        TREND_INSUFFICIENT,
    ]


def test_research_endpoints_auth_and_payloads(app, client):
    assert client.get("/api/screener").status_code == 401
    assert client.get("/api/market/overview").status_code == 401
    assert client.get("/api/stocks/ALPHA.NS/analysis").status_code == 401

    headers = _auth_header(client)

    dates = pd.bdate_range("2024-01-01", periods=300)
    with app.app_context():
        for sym, sector, rate in [
            ("ALPHA.NS", "Tech", 0.002),
            ("BETA.NS", "Healthcare", -0.0005),
        ]:
            stock = Stock(symbol=sym, name=f"{sym} Ltd", sector=sector, is_active=True)
            db.session.add(stock)
            db.session.commit()

            prices = 100.0 * np.power(1.0 + rate, np.arange(len(dates), dtype=float))
            bars = [
                {
                    "date": d.date(),
                    "open": float(px),
                    "high": float(px),
                    "low": float(px),
                    "close": float(px),
                    "volume": 500000,
                }
                for d, px in zip(dates, prices)
            ]
            upsert_prices(stock.id, bars)

        upsert_benchmark_prices(
            "^CNX200",
            [{"date": d.date(), "close": 1000.0} for d in dates],
        )

    screener_res = client.get("/api/screener", headers=headers)
    assert screener_res.status_code == 200
    screener_data = screener_res.get_json()
    assert screener_data["count"] == 2
    assert screener_data["stocks"][0]["symbol"] == "ALPHA.NS"
    assert screener_data["stocks"][0]["trend"] == TREND_STRONG_UPTREND
    assert screener_data["stocks"][1]["trend"] == TREND_DOWNTREND

    overview_res = client.get("/api/market/overview", headers=headers)
    assert overview_res.status_code == 200
    overview = overview_res.get_json()
    assert overview["summary"]["total_stocks"] == 2
    assert overview["summary"]["pct_above_200dma"] == 50.0
    assert len(overview["sectors"]) == 2
    assert len(overview["breadth_history"]) > 0

    assert client.get("/api/stocks/ALPHA.NS/analysis?range=bad", headers=headers).status_code == 400
    assert client.get("/api/stocks/NOPE.NS/analysis", headers=headers).status_code == 404

    analysis_res = client.get("/api/stocks/ALPHA.NS/analysis?range=1y", headers=headers)
    assert analysis_res.status_code == 200
    analysis = analysis_res.get_json()
    assert analysis["score_breakdown"]["eligible"] is True
    assert analysis["score_breakdown"]["price_252_ago"] is not None
    assert analysis["score_breakdown"]["price_21_ago"] is not None
    assert len(analysis["series"]) > 0
    assert len(analysis["rank_history"]) > 0
