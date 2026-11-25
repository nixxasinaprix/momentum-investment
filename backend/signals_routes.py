"""Protected momentum signal endpoint."""

from datetime import date
import math
from flask import Blueprint, jsonify, request
from sqlalchemy import func

from auth import login_required
from data_access import load_price_matrix
from models import Price, Stock, db
from signals import (
    ALLOWED_METHODS,
    compute_scores,
    resolve_effective_as_of,
    select_top,
)

signals_bp = Blueprint("signals", __name__, url_prefix="/api")

TOP_MIN, TOP_MAX = 1, 100
LOOKBACK_MIN, LOOKBACK_MAX = 60, 504
SKIP_MIN, SKIP_MAX = 0, 63


def _parse_int_param(name: str, default: int, min_val: int, max_val: int) -> tuple[int | None, str | None]:
    """Parse and range-check an integer query parameter."""
    raw = request.args.get(name)
    if raw is None or raw == "":
        return default, None
    try:
        value = int(raw)
    except ValueError:
        return None, f"Parameter '{name}' must be an integer."
    if value < min_val or value > max_val:
        return None, f"Parameter '{name}' must be between {min_val} and {max_val}."
    return value, None


def _clean_float(value: float) -> float | None:
    """Convert numpy/pandas floats to JSON-safe Python floats."""
    num = float(value)
    return num if math.isfinite(num) else None


@signals_bp.route("/signals", methods=["GET"])
@login_required
def get_signals():
    """Return momentum rankings and selected symbols as of a given date."""
    method = (request.args.get("method") or "vol_adjusted").strip()
    if method not in ALLOWED_METHODS:
        return (
            jsonify(
                {
                    "error": f"Invalid 'method'. Must be one of: {', '.join(ALLOWED_METHODS)}."
                }
            ),
            400,
        )

    top, err = _parse_int_param("top", 20, TOP_MIN, TOP_MAX)
    if err:
        return jsonify({"error": err}), 400

    lookback, err = _parse_int_param("lookback", 252, LOOKBACK_MIN, LOOKBACK_MAX)
    if err:
        return jsonify({"error": err}), 400

    skip, err = _parse_int_param("skip", 21, SKIP_MIN, SKIP_MAX)
    if err:
        return jsonify({"error": err}), 400

    if skip >= lookback:
        return jsonify({"error": "Parameter 'skip' must be less than 'lookback'."}), 400

    as_of_param = request.args.get("as_of")
    if as_of_param:
        try:
            requested_as_of = date.fromisoformat(as_of_param.strip())
        except ValueError:
            return jsonify({"error": "Invalid 'as_of' date format. Use YYYY-MM-DD."}), 400
    else:
        latest_date = db.session.query(func.max(Price.date)).scalar()
        if latest_date is None:
            return jsonify({"error": "No price data available in database."}), 404
        requested_as_of = latest_date

    prices = load_price_matrix(db.session, start=None, end=requested_as_of)
    effective_ts = resolve_effective_as_of(prices, requested_as_of)
    as_of_used = effective_ts.date().isoformat() if effective_ts is not None else None

    scores = compute_scores(
        prices,
        as_of=requested_as_of,
        method=method,
        lookback_days=lookback,
        skip_days=skip,
    )
    selected_set = set(select_top(scores, top))

    stock_meta = {
        s.symbol: (s.name, s.sector)
        for s in Stock.query.filter_by(is_active=True).all()
    }

    ranked_stocks = []
    for row in scores.itertuples(index=False):
        name, sector = stock_meta.get(row.symbol, (row.symbol, None))
        ranked_stocks.append(
            {
                "rank": int(row.rank),
                "symbol": row.symbol,
                "name": name,
                "sector": sector,
                "momentum": _clean_float(row.momentum),
                "volatility": _clean_float(row.volatility),
                "score": _clean_float(row.score),
                "is_selected": row.symbol in selected_set,
            }
        )

    return (
        jsonify(
            {
                "as_of": as_of_used,
                "parameters": {
                    "method": method,
                    "top": top,
                    "lookback": lookback,
                    "skip": skip,
                },
                "signals": ranked_stocks,
            }
        ),
        200,
    )
