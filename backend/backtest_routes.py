"""Protected API endpoints for running and retrieving momentum backtests."""

from datetime import date
import math
from flask import Blueprint, g, jsonify, request

from auth import login_required
from backtest import run_backtest
from data_access import load_benchmark_series, load_price_matrix
from models import BacktestRun, db
from signals import ALLOWED_METHODS

backtest_bp = Blueprint("backtest", __name__, url_prefix="/api")

BENCHMARK_CANDIDATES = (
    ("^CNX200", "NIFTY 200", None),
    (
        "^NSEI",
        "NIFTY 50",
        "Nifty 200 (^CNX200) unavailable in database; using Nifty 50 (^NSEI) fallback.",
    ),
)

TOP_MIN, TOP_MAX = 1, 100
LOOKBACK_MIN, LOOKBACK_MAX = 60, 504
SKIP_MIN, SKIP_MAX = 0, 63
COST_BPS_MIN, COST_BPS_MAX = 0.0, 100.0
RF_MIN, RF_MAX = 0.0, 0.5


def _parse_int_field(data: dict, keys: tuple[str, ...], default: int, min_val: int, max_val: int) -> tuple[int | None, str | None]:
    """Extract and validate a bounded integer parameter from JSON input."""
    raw = None
    used_key = keys[0]
    for key in keys:
        if key in data and data[key] is not None:
            raw = data[key]
            used_key = key
            break

    if raw is None:
        return default, None
    if isinstance(raw, bool) or not isinstance(raw, int):
        try:
            if isinstance(raw, bool) or isinstance(raw, float) and not raw.is_integer():
                return None, f"Parameter '{used_key}' must be an integer."
            raw = int(raw)
        except (TypeError, ValueError):
            return None, f"Parameter '{used_key}' must be an integer."

    if raw < min_val or raw > max_val:
        return None, f"Parameter '{used_key}' must be between {min_val} and {max_val}."
    return raw, None


def _parse_float_field(data: dict, key: str, default: float, min_val: float, max_val: float | None = None) -> tuple[float | None, str | None]:
    """Extract and validate a bounded numeric parameter from JSON input."""
    if key not in data or data[key] is None:
        return default, None
    raw = data[key]
    if isinstance(raw, bool):
        return None, f"Parameter '{key}' must be a number."
    try:
        val = float(raw)
    except (TypeError, ValueError):
        return None, f"Parameter '{key}' must be a number."
    if not math.isfinite(val):
        return None, f"Parameter '{key}' must be finite."
    if val < min_val or (max_val is not None and val > max_val):
        bound_msg = f"between {min_val} and {max_val}" if max_val is not None else f">= {min_val}"
        return None, f"Parameter '{key}' must be {bound_msg}."
    return val, None


def _parse_date_field(data: dict, key: str) -> tuple[date | None, str | None]:
    """Parse an optional YYYY-MM-DD date parameter."""
    raw = data.get(key)
    if raw is None or raw == "":
        return None, None
    if not isinstance(raw, str):
        return None, f"Parameter '{key}' must be a YYYY-MM-DD date string."
    try:
        return date.fromisoformat(raw.strip()), None
    except ValueError:
        return None, f"Invalid '{key}' date format. Use YYYY-MM-DD."


def _validate_backtest_payload(payload) -> tuple[dict | None, str | None]:
    """Validate POST /api/backtest JSON body and return normalized params."""
    if payload is None:
        data = {}
    elif isinstance(payload, dict):
        data = payload
    else:
        return None, "Request body must be a JSON object."

    top_n, err = _parse_int_field(data, ("top_n", "top"), 20, TOP_MIN, TOP_MAX)
    if err:
        return None, err

    lookback, err = _parse_int_field(
        data, ("lookback_days", "lookback"), 252, LOOKBACK_MIN, LOOKBACK_MAX
    )
    if err:
        return None, err

    skip, err = _parse_int_field(data, ("skip_days", "skip"), 21, SKIP_MIN, SKIP_MAX)
    if err:
        return None, err

    if skip >= lookback:
        return None, "Parameter 'skip' must be strictly less than 'lookback'."

    cost_bps, err = _parse_float_field(data, "cost_bps", 20.0, COST_BPS_MIN, COST_BPS_MAX)
    if err:
        return None, err

    initial_capital, err = _parse_float_field(data, "initial_capital", 1_000_000.0, 1.0, None)
    if err:
        return None, err

    risk_free_rate, err = _parse_float_field(data, "risk_free_rate", 0.065, RF_MIN, RF_MAX)
    if err:
        return None, err

    method = data.get("method", "vol_adjusted")
    if not isinstance(method, str) or method.strip() not in ALLOWED_METHODS:
        return (
            None,
            f"Invalid 'method'. Must be one of: {', '.join(ALLOWED_METHODS)}.",
        )
    method = method.strip()

    rebalance = data.get("rebalance", "monthly")
    if not isinstance(rebalance, str) or rebalance.strip() != "monthly":
        return None, "Invalid 'rebalance'. Only 'monthly' is supported."

    start_date, err = _parse_date_field(data, "start")
    if err:
        return None, err

    end_date, err = _parse_date_field(data, "end")
    if err:
        return None, err

    if start_date is not None and end_date is not None and start_date >= end_date:
        return None, "'start' date must be strictly before 'end' date."

    return (
        {
            "top_n": top_n,
            "lookback_days": lookback,
            "skip_days": skip,
            "method": method,
            "rebalance": "monthly",
            "cost_bps": cost_bps,
            "initial_capital": initial_capital,
            "risk_free_rate": risk_free_rate,
            "start": start_date.isoformat() if start_date else None,
            "end": end_date.isoformat() if end_date else None,
        },
        None,
    )


def _load_active_benchmark(end_date: str | None) -> tuple[dict | None, object]:
    """Load the primary Nifty 200 benchmark, or Nifty 50 fallback if unavailable."""
    for symbol, name, note in BENCHMARK_CANDIDATES:
        series = load_benchmark_series(db.session, symbol=symbol, start=None, end=end_date)
        if not series.empty:
            info = {"symbol": symbol, "name": name}
            if note:
                info["note"] = note
            return info, series
    return None, None


@backtest_bp.route("/backtest", methods=["POST"])
@login_required
def create_backtest():
    """Validate parameters, execute a momentum backtest, persist it, and return results."""
    payload = request.get_json(silent=True)
    if request.data and payload is None:
        return jsonify({"error": "Invalid JSON request body."}), 400

    params, err = _validate_backtest_payload(payload)
    if err:
        return jsonify({"error": err}), 400

    prices = load_price_matrix(db.session, start=None, end=params["end"])
    if prices.empty:
        return jsonify({"error": "No stock price data available in database."}), 404

    bench_info, benchmark = _load_active_benchmark(params["end"])
    if benchmark is None:
        return jsonify({"error": "No benchmark price data available in database."}), 404

    try:
        bt_output = run_backtest(prices, benchmark, params)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    persisted_result = {
        "benchmark": bench_info,
        "start_date": bt_output["start_date"],
        "end_date": bt_output["end_date"],
        "yearly_returns": bt_output["yearly_returns"],
        "equity_curve": bt_output["equity_curve"],
        "rebalances": bt_output["rebalances"],
        "data_warnings": bt_output["data_warnings"],
    }

    run = BacktestRun(
        user_id=g.user.id,
        params=bt_output["params"],
        metrics=bt_output["metrics"],
        result=persisted_result,
    )
    db.session.add(run)
    db.session.commit()

    return jsonify(run.to_full_dict()), 201


@backtest_bp.route("/backtests", methods=["GET"])
@login_required
def list_backtests():
    """List saved backtest runs for the current user (headline metrics only)."""
    runs = (
        BacktestRun.query.filter_by(user_id=g.user.id)
        .order_by(BacktestRun.created_at.desc(), BacktestRun.id.desc())
        .all()
    )
    return jsonify({"runs": [r.to_summary_dict() for r in runs]}), 200


@backtest_bp.route("/backtests/<int:run_id>", methods=["GET"])
@login_required
def get_backtest(run_id: int):
    """Return full details for a single backtest run owned by the current user."""
    run = BacktestRun.query.filter_by(id=run_id, user_id=g.user.id).first()
    if run is None:
        return jsonify({"error": "Backtest run not found"}), 404
    return jsonify(run.to_full_dict()), 200
