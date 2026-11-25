"""Tests for the pure momentum signal engine and /api/signals endpoint."""

from datetime import date
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
from models import Price, Stock, db  # noqa: E402
from scripts.ingest_prices import upsert_prices  # noqa: E402
from signals import (  # noqa: E402
    compute_momentum,
    compute_scores,
    compute_volatility,
    select_top,
)
from signals_routes import signals_bp  # noqa: E402


def _make_dates(n_days: int, start: str = "2024-01-01") -> pd.DatetimeIndex:
    return pd.bdate_range(start=start, periods=n_days)


def _const_growth_series(n_days: int, daily_rate: float, start_price: float = 100.0) -> np.ndarray:
    return start_price * np.power(1.0 + daily_rate, np.arange(n_days, dtype=float))


@pytest.fixture()
def app():
    test_app = Flask(__name__)
    test_app.config["TESTING"] = True
    test_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    test_app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(test_app)
    test_app.register_blueprint(auth_bp)
    test_app.register_blueprint(signals_bp)

    with test_app.app_context():
        db.create_all()
        yield test_app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def _auth_header(client, email="signals@example.com", password="password123"):
    res = client.post(
        "/api/auth/signup",
        json={"email": email, "password": password},
    )
    token = res.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_constant_growth_momentum():
    n_days = 300
    lookback = 252
    skip = 21
    daily_rate = 0.001

    dates = _make_dates(n_days)
    prices = pd.DataFrame(
        {"STEADY.NS": _const_growth_series(n_days, daily_rate)},
        index=dates,
    )
    as_of = dates[-1]

    mom = compute_momentum(prices, as_of, lookback_days=lookback, skip_days=skip)
    expected = (1.0 + daily_rate) ** (lookback - skip) - 1.0
    assert np.isclose(mom["STEADY.NS"], expected, rtol=1e-12)


def test_no_look_ahead_with_extreme_future_prices():
    n_days = 320
    dates = _make_dates(n_days)
    rng = np.random.default_rng(42)

    base_prices = pd.DataFrame(
        {
            "ALPHA.NS": 100.0 * np.exp(np.cumsum(rng.normal(0.0008, 0.012, n_days))),
            "BETA.NS": 100.0 * np.exp(np.cumsum(rng.normal(0.0003, 0.018, n_days))),
            "GAMMA.NS": 100.0 * np.exp(np.cumsum(rng.normal(0.0005, 0.010, n_days))),
        },
        index=dates,
    )

    as_of_d = dates[290]
    prices_before = base_prices.loc[:as_of_d].copy()
    scores_before = compute_scores(prices_before, as_of_d, method="vol_adjusted")

    # Mutate all rows strictly after date D with extreme crashes / spikes
    prices_with_future = base_prices.copy()
    future_mask = prices_with_future.index > as_of_d
    prices_with_future.loc[future_mask, "ALPHA.NS"] = 1e-3
    prices_with_future.loc[future_mask, "BETA.NS"] = 1e9
    prices_with_future.loc[future_mask, "GAMMA.NS"] = 5e5

    scores_after = compute_scores(prices_with_future, as_of_d, method="vol_adjusted")
    pd.testing.assert_frame_equal(scores_before, scores_after)


def test_recent_skip_days_do_not_affect_momentum():
    n_days = 300
    lookback = 252
    skip = 21
    dates = _make_dates(n_days)

    prices_a = pd.DataFrame(
        {"TEST.NS": _const_growth_series(n_days, 0.001)},
        index=dates,
    )
    prices_b = prices_a.copy()
    # Wildly change the most recent `skip` trading days
    prices_b.iloc[-skip:, 0] = np.linspace(5000.0, 1.0, skip)

    as_of = dates[-1]
    mom_a = compute_momentum(prices_a, as_of, lookback_days=lookback, skip_days=skip)
    mom_b = compute_momentum(prices_b, as_of, lookback_days=lookback, skip_days=skip)
    assert np.isclose(mom_a["TEST.NS"], mom_b["TEST.NS"], rtol=1e-12)


def test_eligibility_excludes_short_history_and_missing_positions():
    n_days = 300
    lookback = 252
    skip = 21
    dates = _make_dates(n_days)

    # FULL: full 300 days
    # JUST_SHORT: 272 rows before as_of (< 252 + 21 = 273)
    # MISSING_END: NaN right at as_of - skip_days
    # MISSING_START: NaN right at as_of - lookback_days
    full_series = _const_growth_series(n_days, 0.001)
    just_short = np.full(n_days, np.nan)
    just_short[-(lookback + skip):] = _const_growth_series(lookback + skip, 0.002)

    missing_end = full_series.copy()
    missing_end[-1 - skip] = np.nan

    missing_start = full_series.copy()
    missing_start[-1 - lookback] = np.nan

    prices = pd.DataFrame(
        {
            "FULL.NS": full_series,
            "SHORT.NS": just_short,
            "MISS_END.NS": missing_end,
            "MISS_START.NS": missing_start,
        },
        index=dates,
    )

    scores = compute_scores(prices, dates[-1], method="raw", lookback_days=lookback, skip_days=skip)
    assert scores["symbol"].tolist() == ["FULL.NS"]


def test_non_trading_day_as_of_uses_previous_trading_day():
    n_days = 300
    dates = pd.bdate_range("2024-01-01", periods=n_days)  # Mon-Fri only
    prices = pd.DataFrame(
        {"A.NS": _const_growth_series(n_days, 0.001)},
        index=dates,
    )
    # Find a Friday in the tail
    last_friday = dates[dates.weekday == 4][-1]
    sunday = last_friday + pd.Timedelta(days=2)

    scores_fri = compute_scores(prices, last_friday, method="vol_adjusted")
    scores_sun = compute_scores(prices, sunday, method="vol_adjusted")
    pd.testing.assert_frame_equal(scores_fri, scores_sun)


def test_vol_adjusted_favors_lower_volatility_for_same_momentum():
    n_days = 300
    lookback = 252
    skip = 21
    dates = _make_dates(n_days)

    # Both stocks start at 100 on t - lookback and end at 130 on t - skip (30% momentum).
    # LOWVOL moves smoothly; HIGHVOL oscillates sharply between those endpoints.
    low_vol = np.linspace(100.0, 135.0, n_days)
    start_idx = n_days - 1 - lookback
    end_idx = n_days - 1 - skip
    low_vol[start_idx] = 100.0
    low_vol[end_idx] = 130.0

    high_vol = low_vol.copy()
    oscillation = np.where(np.arange(n_days) % 2 == 0, 1.04, 0.96)
    high_vol = high_vol * oscillation
    high_vol[start_idx] = 100.0
    high_vol[end_idx] = 130.0

    prices = pd.DataFrame(
        {"LOWVOL.NS": low_vol, "HIGHVOL.NS": high_vol},
        index=dates,
    )
    as_of = dates[-1]

    mom = compute_momentum(prices, as_of, lookback_days=lookback, skip_days=skip)
    assert np.isclose(mom["LOWVOL.NS"], 0.30)
    assert np.isclose(mom["HIGHVOL.NS"], 0.30)

    vol = compute_volatility(prices, as_of, window=lookback)
    assert vol["LOWVOL.NS"] < vol["HIGHVOL.NS"]

    scores = compute_scores(prices, as_of, method="vol_adjusted", lookback_days=lookback, skip_days=skip)
    assert scores["symbol"].tolist() == ["LOWVOL.NS", "HIGHVOL.NS"]
    assert scores["rank"].tolist() == [1, 2]


def test_ranking_has_no_ties_and_select_top_returns_n_in_order():
    n_days = 300
    dates = _make_dates(n_days)

    # Identical series for TIE_B and TIE_A to force exact score tie
    series_tie = _const_growth_series(n_days, 0.001)
    series_high = _const_growth_series(n_days, 0.002)
    series_low = _const_growth_series(n_days, 0.0005)

    prices = pd.DataFrame(
        {
            "TIE_B.NS": series_tie,
            "TIE_A.NS": series_tie.copy(),
            "HIGH.NS": series_high,
            "LOW.NS": series_low,
        },
        index=dates,
    )

    scores = compute_scores(prices, dates[-1], method="raw")
    ranks = scores["rank"].tolist()
    assert ranks == [1, 2, 3, 4]
    assert len(set(ranks)) == len(ranks)

    top_3 = select_top(scores, 3)
    assert len(top_3) == 3
    assert top_3 == ["HIGH.NS", "TIE_A.NS", "TIE_B.NS"]


def test_signals_endpoint_auth_validation_and_ordering(app, client):
    # Requires authentication
    assert client.get("/api/signals").status_code == 401

    headers = _auth_header(client)

    # Seed 3 stocks with 100 business days of data so lookback=60, skip=10 works cleanly
    n_days = 100
    dates = _make_dates(n_days, start="2025-01-01")
    rates = {"FAST.NS": 0.003, "MID.NS": 0.0015, "SLOW.NS": 0.0005}

    with app.app_context():
        for sym, rate in rates.items():
            stock = Stock(symbol=sym, name=f"{sym} Corp", sector="Tech", is_active=True)
            db.session.add(stock)
            db.session.commit()

            series = _const_growth_series(n_days, rate)
            bars = [
                {
                    "date": d.date(),
                    "open": float(px),
                    "high": float(px),
                    "low": float(px),
                    "close": float(px),
                    "volume": 100000,
                }
                for d, px in zip(dates, series)
            ]
            upsert_prices(stock.id, bars)

    # Bad parameter validation -> 400
    assert client.get("/api/signals?method=bad", headers=headers).status_code == 400
    assert client.get("/api/signals?top=0", headers=headers).status_code == 400
    assert client.get("/api/signals?top=101", headers=headers).status_code == 400
    assert client.get("/api/signals?lookback=59", headers=headers).status_code == 400
    assert client.get("/api/signals?lookback=505", headers=headers).status_code == 400
    assert client.get("/api/signals?skip=-1", headers=headers).status_code == 400
    assert client.get("/api/signals?skip=64", headers=headers).status_code == 400
    assert client.get("/api/signals?lookback=60&skip=60", headers=headers).status_code == 400
    assert client.get("/api/signals?as_of=not-a-date", headers=headers).status_code == 400

    # Valid request using raw method and top=2
    res = client.get(
        "/api/signals?method=raw&top=2&lookback=60&skip=10",
        headers=headers,
    )
    assert res.status_code == 200
    payload = res.get_json()

    assert payload["as_of"] == dates[-1].date().isoformat()
    assert payload["parameters"] == {
        "method": "raw",
        "top": 2,
        "lookback": 60,
        "skip": 10,
    }

    signals = payload["signals"]
    assert [s["symbol"] for s in signals] == ["FAST.NS", "MID.NS", "SLOW.NS"]
    assert [s["rank"] for s in signals] == [1, 2, 3]
    assert [s["is_selected"] for s in signals] == [True, True, False]
    assert signals[0]["name"] == "FAST.NS Corp"
    assert signals[0]["sector"] == "Tech"
    assert signals[0]["score"] > signals[1]["score"] > signals[2]["score"]
