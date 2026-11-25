"""Tests for the monthly momentum backtester and /api/backtest endpoints."""

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
from backtest import _compute_series_metrics, run_backtest  # noqa: E402
from backtest_routes import backtest_bp  # noqa: E402
from models import Stock, db  # noqa: E402
from scripts.ingest_benchmark import upsert_benchmark_prices  # noqa: E402
from scripts.ingest_prices import upsert_prices  # noqa: E402


def _make_bdate_range(start: str, end: str) -> pd.DatetimeIndex:
    return pd.bdate_range(start=start, end=end)


@pytest.fixture()
def app():
    test_app = Flask(__name__)
    test_app.config["TESTING"] = True
    test_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    test_app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(test_app)
    test_app.register_blueprint(auth_bp)
    test_app.register_blueprint(backtest_bp)

    with test_app.app_context():
        db.create_all()
        yield test_app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def _auth_header(client, email="bt@example.com", password="password123"):
    res = client.post(
        "/api/auth/signup",
        json={"email": email, "password": password},
    )
    token = res.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_known_answer_steady_winner_zero_cost():
    dates = _make_bdate_range("2024-01-01", "2024-04-30")
    n = len(dates)
    daily_rate = 0.004

    winner = 100.0 * np.power(1.0 + daily_rate, np.arange(n, dtype=float))
    flat_a = np.full(n, 100.0)
    flat_b = np.full(n, 50.0)

    prices = pd.DataFrame(
        {"WINNER.NS": winner, "FLAT_A.NS": flat_a, "FLAT_B.NS": flat_b},
        index=dates,
    )
    benchmark = pd.Series(np.full(n, 1000.0), index=dates, name="BENCH")

    params = {
        "top_n": 1,
        "lookback_days": 10,
        "skip_days": 2,
        "method": "raw",
        "cost_bps": 0.0,
        "initial_capital": 1_000_000.0,
    }
    result = run_backtest(prices, benchmark, params)

    # First month-end is 2024-01-31 (has >= 12 prior rows), executed on 2024-02-01.
    first_exec = pd.Timestamp(result["rebalances"][0]["executed_date"])
    assert first_exec == pd.Timestamp("2024-02-01")
    assert all(r["selected_symbols"] == ["WINNER.NS"] for r in result["rebalances"])

    expected_final = 1_000_000.0 * (prices.loc[dates[-1], "WINNER.NS"] / prices.loc[first_exec, "WINNER.NS"])
    actual_final = result["equity_curve"][-1]["portfolio_value"]
    assert np.isclose(actual_final, expected_final, rtol=1e-12)


def test_no_look_ahead_changing_future_prices_does_not_alter_past():
    dates = _make_bdate_range("2024-01-01", "2024-09-30")
    rng = np.random.default_rng(7)
    n = len(dates)

    prices = pd.DataFrame(
        {
            f"STK{i}.NS": 100.0 * np.exp(np.cumsum(rng.normal(0.0005, 0.015, n)))
            for i in range(6)
        },
        index=dates,
    )
    benchmark = pd.Series(
        1000.0 * np.exp(np.cumsum(rng.normal(0.0003, 0.01, n))),
        index=dates,
        name="BENCH",
    )
    params = {"top_n": 2, "lookback_days": 20, "skip_days": 3, "cost_bps": 10.0}

    res_orig = run_backtest(prices, benchmark, params)

    cutoff = "2024-06-14"
    prices_mutated = prices.copy()
    future_mask = prices_mutated.index > pd.Timestamp(cutoff)
    prices_mutated.loc[future_mask, "STK0.NS"] = 1e6
    prices_mutated.loc[future_mask, "STK1.NS"] = 1e-3

    res_mutated = run_backtest(prices_mutated, benchmark, params)

    eq_orig = [row for row in res_orig["equity_curve"] if row["date"] <= cutoff]
    eq_mut = [row for row in res_mutated["equity_curve"] if row["date"] <= cutoff]
    assert eq_orig == eq_mut

    reb_orig = [r for r in res_orig["rebalances"] if r["executed_date"] <= cutoff]
    reb_mut = [r for r in res_mutated["rebalances"] if r["executed_date"] <= cutoff]
    assert reb_orig == reb_mut


def test_execution_lag_next_day_close_no_prejump_fill():
    # Jan + Feb + early March; first signal date is 2024-01-31, exec date is 2024-02-01.
    dates = _make_bdate_range("2024-01-01", "2024-02-15")
    n = len(dates)

    # WINNER leads cleanly by 2024-01-31, then doubles on 2024-02-01 (exec date) and stays flat after.
    winner = np.linspace(100.0, 120.0, n)
    loser = np.full(n, 100.0)

    exec_pos = dates.get_loc(pd.Timestamp("2024-02-01"))
    winner[exec_pos:] = 240.0  # Double at the close of the execution day (2024-02-01)

    prices = pd.DataFrame({"WINNER.NS": winner, "LOSER.NS": loser}, index=dates)
    benchmark = pd.Series(np.full(n, 1000.0), index=dates, name="BENCH")

    result = run_backtest(
        prices,
        benchmark,
        {"top_n": 1, "lookback_days": 10, "skip_days": 2, "method": "raw", "cost_bps": 0.0},
    )

    assert result["rebalances"][0]["signal_date"] == "2024-01-31"
    assert result["rebalances"][0]["executed_date"] == "2024-02-01"
    assert result["rebalances"][0]["selected_symbols"] == ["WINNER.NS"]

    # Trade executed at 2024-02-01 close (240.0), NOT 2024-01-31 close (~115),
    # and price remained 240.0 afterward, so final value stays 1,000,000.
    assert np.isclose(result["equity_curve"][-1]["portfolio_value"], 1_000_000.0, rtol=1e-12)


def test_transaction_costs_reduce_final_value_and_match_traded_value_rate():
    dates = _make_bdate_range("2024-01-01", "2024-05-31")
    rng = np.random.default_rng(123)
    n = len(dates)

    prices = pd.DataFrame(
        {
            "A.NS": 100.0 * np.exp(np.cumsum(rng.normal(0.001, 0.02, n))),
            "B.NS": 100.0 * np.exp(np.cumsum(rng.normal(0.001, 0.02, n))),
            "C.NS": 100.0 * np.exp(np.cumsum(rng.normal(0.001, 0.02, n))),
            "D.NS": 100.0 * np.exp(np.cumsum(rng.normal(0.001, 0.02, n))),
        },
        index=dates,
    )
    benchmark = pd.Series(np.full(n, 1000.0), index=dates, name="BENCH")

    base_params = {"top_n": 2, "lookback_days": 15, "skip_days": 2, "method": "raw"}
    res_zero = run_backtest(prices, benchmark, {**base_params, "cost_bps": 0.0})
    res_50 = run_backtest(prices, benchmark, {**base_params, "cost_bps": 50.0})

    final_zero = res_zero["equity_curve"][-1]["portfolio_value"]
    final_50 = res_50["equity_curve"][-1]["portfolio_value"]
    assert final_50 < final_zero

    rate = 50.0 / 10_000.0
    for reb in res_50["rebalances"]:
        assert np.isclose(reb["cost_paid"], reb["traded_value"] * rate, rtol=1e-12)

    expected_total_cost = sum(r["traded_value"] * rate for r in res_50["rebalances"])
    assert np.isclose(res_50["metrics"]["strategy"]["total_cost_paid"], expected_total_cost, rtol=1e-12)


def test_equal_weights_after_each_rebalance():
    dates = _make_bdate_range("2024-01-01", "2024-05-31")
    rng = np.random.default_rng(99)
    n = len(dates)

    prices = pd.DataFrame(
        {
            f"S{i}.NS": 100.0 * np.exp(np.cumsum(rng.normal(0.0008, 0.015, n)))
            for i in range(6)
        },
        index=dates,
    )
    benchmark = pd.Series(np.full(n, 1000.0), index=dates, name="BENCH")

    result = run_backtest(
        prices,
        benchmark,
        {"top_n": 3, "lookback_days": 15, "skip_days": 2, "cost_bps": 20.0},
    )

    assert len(result["rebalances"]) >= 3
    for reb in result["rebalances"]:
        weights = list(reb["weights"].values())
        assert len(weights) == 3
        assert np.allclose(weights, 1.0 / 3.0, rtol=1e-12)
        assert np.isclose(sum(weights), 1.0, rtol=1e-12)


def test_metrics_cagr_max_drawdown_and_sharpe_match_hand_calculation():
    # Tiny fixed series: 5 business days starting at 100 -> 120 -> 90 -> 99 -> 132
    dates = pd.DatetimeIndex(
        ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-06", "2025-01-07"]
    )
    values = pd.Series([100.0, 120.0, 90.0, 99.0, 132.0], index=dates)
    rf = 0.065

    metrics = _compute_series_metrics(values, base_capital=100.0, risk_free_rate=rf)

    # Hand-calculated CAGR: (132 / 100) ** (365.25 / 6) - 1
    expected_cagr = (132.0 / 100.0) ** (365.25 / 6.0) - 1.0
    assert np.isclose(metrics["cagr"], expected_cagr, rtol=1e-12)

    # Peak = 120 (2025-01-02), Trough = 90 (2025-01-03) -> -25%, recovered 2025-01-07 (132 >= 120)
    assert np.isclose(metrics["max_drawdown"], -0.25, rtol=1e-12)
    assert metrics["max_drawdown_peak_date"] == "2025-01-02"
    assert metrics["max_drawdown_trough_date"] == "2025-01-03"
    assert metrics["max_drawdown_recovery_date"] == "2025-01-07"

    # Hand-calculated Sharpe: daily returns [0.20, -0.25, 0.10, 1/3]
    daily_r = np.array([0.20, -0.25, 0.10, (132.0 / 99.0) - 1.0])
    rf_daily = rf / 252.0
    vol = np.std(daily_r, ddof=1) * np.sqrt(252.0)
    expected_sharpe = ((np.mean(daily_r - rf_daily)) * 252.0) / vol
    assert np.isclose(metrics["volatility"], vol, rtol=1e-12)
    assert np.isclose(metrics["sharpe_ratio"], expected_sharpe, rtol=1e-12)


def test_backtest_endpoints_auth_validation_isolation(app, client):
    # Requires authentication
    assert client.post("/api/backtest", json={}).status_code == 401
    assert client.get("/api/backtests").status_code == 401
    assert client.get("/api/backtests/1").status_code == 401

    headers_user1 = _auth_header(client, email="u1@example.com")
    headers_user2 = _auth_header(client, email="u2@example.com")

    # Seed 5 months of synthetic prices and benchmark into DB so >= 65 prior days exist before 2024-04-30
    dates = _make_bdate_range("2024-01-01", "2024-05-31")
    rates = {"ALPHA.NS": 0.003, "BETA.NS": 0.001, "GAMMA.NS": 0.0002}

    with app.app_context():
        for sym, rate in rates.items():
            stock = Stock(symbol=sym, name=sym, sector="Tech", is_active=True)
            db.session.add(stock)
            db.session.commit()

            series = 100.0 * np.power(1.0 + rate, np.arange(len(dates), dtype=float))
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

        bench_rows = [
            {"date": d.date(), "close": float(1000.0 * (1.0005 ** idx))}
            for idx, d in enumerate(dates)
        ]
        upsert_benchmark_prices("^CNX200", bench_rows)

    # Bad parameters -> 400
    assert client.post("/api/backtest", json={"top_n": 0}, headers=headers_user1).status_code == 400
    assert client.post("/api/backtest", json={"top_n": 101}, headers=headers_user1).status_code == 400
    assert client.post("/api/backtest", json={"lookback": 59}, headers=headers_user1).status_code == 400
    assert client.post("/api/backtest", json={"skip": 64}, headers=headers_user1).status_code == 400
    assert client.post("/api/backtest", json={"cost_bps": 101}, headers=headers_user1).status_code == 400
    assert client.post("/api/backtest", json={"method": "invalid"}, headers=headers_user1).status_code == 400
    assert client.post(
        "/api/backtest",
        json={"start": "2024-04-01", "end": "2024-03-01"},
        headers=headers_user1,
    ).status_code == 400

    # Valid run for user 1
    res = client.post(
        "/api/backtest",
        json={
            "top_n": 2,
            "lookback_days": 60,
            "skip_days": 5,
            "method": "vol_adjusted",
            "cost_bps": 20,
        },
        headers=headers_user1,
    )
    assert res.status_code == 201
    created = res.get_json()
    run_id = created["id"]
    assert created["benchmark"]["symbol"] == "^CNX200"
    assert len(created["equity_curve"]) > 0
    assert len(created["rebalances"]) >= 1
    assert "bought" in created["rebalances"][0] and "sold" in created["rebalances"][0]
    assert len(created["monthly_returns"]) >= 1
    assert "strategy" in created["metrics"] and "benchmark" in created["metrics"]

    # List user 1 runs (headline metrics only)
    list_res = client.get("/api/backtests", headers=headers_user1)
    assert list_res.status_code == 200
    runs = list_res.get_json()["runs"]
    assert len(runs) == 1
    assert runs[0]["id"] == run_id
    assert "equity_curve" not in runs[0]

    # User 1 can fetch full run; User 2 gets 404
    assert client.get(f"/api/backtests/{run_id}", headers=headers_user1).status_code == 200
    assert client.get(f"/api/backtests/{run_id}", headers=headers_user2).status_code == 404
    assert client.get("/api/backtests/99999", headers=headers_user1).status_code == 404
