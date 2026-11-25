"""Tests for the pure pandas stock-picking pipeline and /api/pipeline/run endpoint."""

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
from models import Stock, db  # noqa: E402
from pipeline import CRORE, run_pipeline  # noqa: E402
from pipeline_routes import _PIPELINE_CACHE, pipeline_bp  # noqa: E402
from scripts.ingest_prices import upsert_prices  # noqa: E402


def _make_synthetic_universe(n_days: int = 320):
    dates = pd.bdate_range("2024-01-01", periods=n_days)
    t = np.arange(n_days, dtype=float)

    # WIN1 & WIN2: strong steady uptrends passing all quality filters
    # LOW_PRICE: price = 20 (< min_price 50)
    # LOW_MCAP: strong growth, small market cap (1000 Cr < 5000 Cr)
    # UNKNOWN_MCAP: strong growth, missing market cap
    # ILLIQUID: tiny volume (< 5 Cr turnover)
    # BELOW_200DMA: rises early, crashes below 200DMA at end
    # EXCL_SECTOR: strong growth, excluded sector "Tobacco"
    prices = pd.DataFrame(
        {
            "WIN1.NS": 100.0 * np.power(1.0025, t),
            "WIN2.NS": 120.0 * np.power(1.0018, t),
            "LOW_PRICE.NS": 20.0 * np.power(1.001, t),
            "LOW_MCAP.NS": 150.0 * np.power(1.003, t),
            "UNKNOWN_MCAP.NS": 150.0 * np.power(1.0028, t),
            "ILLIQUID.NS": 200.0 * np.power(1.002, t),
            "BELOW_200DMA.NS": np.concatenate(
                [100.0 * np.power(1.003, t[:260]), np.linspace(210.0, 90.0, n_days - 260)]
            ),
            "EXCL_SECTOR.NS": 150.0 * np.power(1.002, t),
        },
        index=dates,
    )

    volumes = pd.DataFrame(1_000_000.0, index=dates, columns=prices.columns)
    volumes["ILLIQUID.NS"] = 100.0  # 200 * 100 = 20,000 INR << 5 Cr

    meta = [
        {"symbol": "WIN1.NS", "name": "Winner One", "sector": "Healthcare", "market_cap": 20_000 * CRORE},
        {"symbol": "WIN2.NS", "name": "Winner Two", "sector": "Financials", "market_cap": 15_000 * CRORE},
        {"symbol": "LOW_PRICE.NS", "name": "Cheap Co", "sector": "Metals", "market_cap": 10_000 * CRORE},
        {"symbol": "LOW_MCAP.NS", "name": "Small Co", "sector": "IT", "market_cap": 1_000 * CRORE},
        {"symbol": "UNKNOWN_MCAP.NS", "name": "Mystery Co", "sector": "IT", "market_cap": None},
        {"symbol": "ILLIQUID.NS", "name": "Thin Co", "sector": "Industrials", "market_cap": 10_000 * CRORE},
        {"symbol": "BELOW_200DMA.NS", "name": "Broken Co", "sector": "Auto", "market_cap": 12_000 * CRORE},
        {"symbol": "EXCL_SECTOR.NS", "name": "Tab Co", "sector": "Tobacco", "market_cap": 25_000 * CRORE},
    ]
    return prices, volumes, meta


def test_pipeline_filters_reasons_and_unknown_mcap_policy():
    prices, volumes, meta = _make_synthetic_universe()
    params = {
        "min_market_cap_cr": 5000.0,
        "unknown_mcap_policy": "exclude",
        "min_price": 50.0,
        "min_avg_traded_value_cr": 5.0,
        "min_history_days": 273,
        "above_200dma": True,
        "max_pct_below_52w_high": 25.0,
        "excluded_sectors": ["Tobacco"],
        "method": "vol_adjusted",
        "top_n": 5,
    }

    res = run_pipeline(prices, volumes, meta, params)
    selected_syms = [s["symbol"] for s in res["selected"]]
    assert selected_syms == ["WIN1.NS", "WIN2.NS"]
    assert res["stages"][0]["count"] == 8
    assert res["stages"][1]["count"] == 2
    assert res["stages"][3]["count"] == 2
    assert np.isclose(res["selected"][0]["weight"], 0.5)

    excl_by_sym = {e["symbol"]: e for e in res["excluded"]}
    assert "Unknown market cap" in excl_by_sym["UNKNOWN_MCAP.NS"]["removal_reason"]
    assert "Market cap" in excl_by_sym["LOW_MCAP.NS"]["removal_reason"]
    assert "Excluded sector" in excl_by_sym["EXCL_SECTOR.NS"]["removal_reason"]
    assert "Price" in excl_by_sym["LOW_PRICE.NS"]["removal_reason"]
    assert "turnover" in excl_by_sym["ILLIQUID.NS"]["removal_reason"]
    assert "200DMA" in excl_by_sym["BELOW_200DMA.NS"]["removal_reason"]

    # Switch unknown_mcap_policy to "include" -> UNKNOWN_MCAP.NS now enters
    res_incl = run_pipeline(prices, volumes, meta, {**params, "unknown_mcap_policy": "include"})
    assert "UNKNOWN_MCAP.NS" in [s["symbol"] for s in res_incl["selected"]]


def test_pipeline_zscore_blend_and_buy_sell_hold():
    dates = pd.bdate_range("2024-01-01", periods=340)
    t = np.arange(len(dates), dtype=float)
    # A leads earlier, then stalls; B accelerates strongly in the last 3 months
    a_px = np.concatenate([100 * np.power(1.003, t[:295]), np.full(len(dates) - 295, 240.0)])
    b_px = np.concatenate([100 * np.power(1.0005, t[:260]), 114 * np.power(1.006, np.arange(len(dates) - 260))])
    c_px = 100 * np.power(1.001, t)

    prices = pd.DataFrame({"A.NS": a_px, "B.NS": b_px, "C.NS": c_px}, index=dates)
    volumes = pd.DataFrame(1_000_000.0, index=dates, columns=prices.columns)
    meta = [
        {"symbol": s, "name": s, "sector": "Tech", "market_cap": 10_000 * CRORE}
        for s in prices.columns
    ]

    res = run_pipeline(
        prices,
        volumes,
        meta,
        {
            "min_market_cap_cr": 0,
            "min_price": 0,
            "min_avg_traded_value_cr": 0,
            "above_200dma": False,
            "max_pct_below_52w_high": None,
            "method": "zscore_blend",
            "top_n": 1,
        },
    )
    assert res["selected"][0]["symbol"] == "B.NS"
    assert [x["symbol"] for x in res["changes"]["buy"]] == ["B.NS"]
    assert [x["symbol"] for x in res["changes"]["sell"]] == ["A.NS"]
    assert res["changes"]["hold"] == []


def test_pipeline_no_look_ahead_when_future_prices_altered():
    prices, volumes, meta = _make_synthetic_universe(n_days=340)
    as_of_d = prices.index[310]
    params = {
        "as_of": as_of_d.date().isoformat(),
        "min_market_cap_cr": 5000.0,
        "min_price": 50.0,
        "min_avg_traded_value_cr": 5.0,
        "above_200dma": True,
        "max_pct_below_52w_high": 25.0,
        "top_n": 2,
    }

    res_before = run_pipeline(prices.loc[:as_of_d], volumes.loc[:as_of_d], meta, params)

    # Corrupt all prices & volumes strictly after as_of_d
    future_mask = prices.index > as_of_d
    prices_corrupt = prices.copy()
    volumes_corrupt = volumes.copy()
    prices_corrupt.loc[future_mask, "WIN1.NS"] = 1.0
    prices_corrupt.loc[future_mask, "LOW_PRICE.NS"] = 50_000.0
    volumes_corrupt.loc[future_mask, :] = 1.0

    res_after = run_pipeline(prices_corrupt, volumes_corrupt, meta, params)
    assert res_before == res_after


@pytest.fixture()
def app():
    _PIPELINE_CACHE.clear()
    test_app = Flask(__name__)
    test_app.config["TESTING"] = True
    test_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    test_app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(test_app)
    test_app.register_blueprint(auth_bp)
    test_app.register_blueprint(pipeline_bp)

    with test_app.app_context():
        db.create_all()
        yield test_app
        db.session.remove()
        db.drop_all()
        _PIPELINE_CACHE.clear()


def test_pipeline_endpoint_auth_validation_and_run(app):
    client = app.test_client()
    assert client.get("/api/pipeline/run").status_code == 401
    assert client.post("/api/pipeline/run", json={}).status_code == 401

    token = client.post(
        "/api/auth/signup",
        json={"email": "pipe@example.com", "password": "password123"},
    ).get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    dates = pd.bdate_range("2024-01-01", periods=310)
    with app.app_context():
        for sym, mcap, rate in [
            ("BIG.NS", 20_000 * CRORE, 0.002),
            ("SMALL.NS", 500 * CRORE, 0.003),
        ]:
            stock = Stock(symbol=sym, name=sym, sector="Tech", market_cap=mcap, is_active=True)
            db.session.add(stock)
            db.session.commit()
            pxs = 100.0 * np.power(1.0 + rate, np.arange(len(dates), dtype=float))
            upsert_prices(
                stock.id,
                [
                    {
                        "date": d.date(),
                        "open": float(p),
                        "high": float(p),
                        "low": float(p),
                        "close": float(p),
                        "volume": 1_000_000,
                    }
                    for d, p in zip(dates, pxs)
                ],
            )

    assert client.post("/api/pipeline/run", json={"method": "bad"}, headers=headers).status_code == 400
    assert client.get("/api/pipeline/run?top_n=0", headers=headers).status_code == 400

    res = client.post(
        "/api/pipeline/run",
        json={"min_market_cap_cr": 5000, "top_n": 10},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.get_json()
    assert [s["count"] for s in data["stages"]] == [2, 1, 1, 1]
    assert [s["symbol"] for s in data["selected"]] == ["BIG.NS"]
    assert data["excluded"][0]["symbol"] == "SMALL.NS"
