"""Protected API endpoint for running the full Nifty 500 momentum pipeline."""

import json
import time
from flask import Blueprint, jsonify, request
from sqlalchemy import func

from auth import login_required
from data_access import load_market_matrices, load_stock_metadata
from models import Price, Stock, db
from pipeline import normalize_pipeline_params, run_pipeline

pipeline_bp = Blueprint("pipeline", __name__, url_prefix="/api")

PIPELINE_CACHE_TTL = 300.0
_PIPELINE_CACHE: dict[tuple, tuple[float, dict]] = {}


def _cache_tag() -> tuple[str, str, int]:
    latest_price = db.session.query(func.max(Price.date)).scalar()
    latest_fund = db.session.query(func.max(Stock.last_updated)).scalar()
    active_cnt = db.session.query(func.count(Stock.id)).filter(Stock.is_active.is_(True)).scalar()
    return (
        latest_price.isoformat() if latest_price else "none",
        latest_fund.isoformat() if latest_fund else "none",
        int(active_cnt or 0),
    )


def _extract_get_params() -> dict:
    args = request.args
    raw: dict = {}
    if "as_of" in args:
        raw["as_of"] = args.get("as_of")
    for k in ("min_market_cap_cr", "min_price", "min_avg_traded_value_cr", "max_pct_below_52w_high"):
        if k in args and args.get(k) != "":
            raw[k] = float(args.get(k))
        elif k in args and args.get(k) == "":
            raw[k] = None
    for k in ("min_history_days", "lookback_days", "lookback", "skip_days", "skip", "top_n", "top"):
        if k in args and args.get(k) != "":
            raw[k] = int(args.get(k))
    if "above_200dma" in args:
        raw["above_200dma"] = args.get("above_200dma").lower() in ("1", "true", "yes")
    if "unknown_mcap_policy" in args:
        raw["unknown_mcap_policy"] = args.get("unknown_mcap_policy")
    if "method" in args:
        raw["method"] = args.get("method")
    if "excluded_sectors" in args:
        raw["excluded_sectors"] = args.get("excluded_sectors")
    return raw


@pipeline_bp.route("/pipeline/run", methods=["GET", "POST"])
@login_required
def run_pipeline_endpoint():
    """Execute the full universe -> filter -> score -> rank -> portfolio pipeline."""
    try:
        if request.method == "POST":
            body = request.get_json(silent=True)
            if request.data and body is None:
                return jsonify({"error": "Invalid JSON request body."}), 400
            if body is not None and not isinstance(body, dict):
                return jsonify({"error": "Request body must be a JSON object."}), 400
            raw_params = body or {}
        else:
            raw_params = _extract_get_params()

        cfg = normalize_pipeline_params(raw_params)
    except (TypeError, ValueError) as exc:
        return jsonify({"error": str(exc)}), 400

    tag = _cache_tag()
    params_key = json.dumps(cfg, sort_keys=True)
    cache_key = ("pipeline_run", *tag, params_key)
    cached = _PIPELINE_CACHE.get(cache_key)
    now = time.monotonic()
    if cached is not None and now < cached[0]:
        return jsonify(cached[1]), 200

    # Cache raw matrices briefly across parameter tweaks
    matrix_key = ("pipeline_matrices", *tag)
    mat_cached = _PIPELINE_CACHE.get(matrix_key)
    if mat_cached is not None and now < mat_cached[0]:
        prices, volumes, stock_meta = mat_cached[1]
    else:
        prices, volumes = load_market_matrices(db.session)
        stock_meta = load_stock_metadata(db.session)
        _PIPELINE_CACHE[matrix_key] = (now + PIPELINE_CACHE_TTL, (prices, volumes, stock_meta))

    if prices.empty:
        return jsonify({"error": "No price data available in database."}), 404

    result = run_pipeline(prices, volumes, stock_meta, cfg)
    result["sectors_available"] = sorted(
        {m.get("sector") or "Other" for m in stock_meta}
    )

    _PIPELINE_CACHE[cache_key] = (now + PIPELINE_CACHE_TTL, result)
    return jsonify(result), 200
