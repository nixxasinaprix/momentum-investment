"""Protected read endpoints for the stock universe and daily price history."""

from datetime import date, timedelta
from flask import Blueprint, jsonify, request

from auth import login_required
from models import Price, Stock

market_bp = Blueprint("market", __name__, url_prefix="/api")


@market_bp.route("/stocks", methods=["GET"])
@login_required
def list_stocks():
    """Return active stocks in the tracked universe."""
    stocks = (
        Stock.query.filter_by(is_active=True)
        .order_by(Stock.symbol.asc())
        .all()
    )
    return jsonify({"stocks": [s.to_dict() for s in stocks]}), 200


@market_bp.route("/prices/<symbol>", methods=["GET"])
@login_required
def get_prices(symbol: str):
    """Return daily adjusted OHLCV prices for a symbol within an optional date range."""
    normalized = symbol.strip().upper()
    stock = Stock.query.filter_by(symbol=normalized).first()
    if stock is None:
        return jsonify({"error": f"Stock '{normalized}' not found"}), 404

    default_to = date.today()
    default_from = default_to - timedelta(days=365)

    from_param = request.args.get("from")
    to_param = request.args.get("to")

    try:
        from_date = date.fromisoformat(from_param) if from_param else default_from
        to_date = date.fromisoformat(to_param) if to_param else default_to
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    if from_date > to_date:
        return jsonify({"error": "'from' date must be on or before 'to' date."}), 400

    bars = (
        Price.query.filter(
            Price.stock_id == stock.id,
            Price.date >= from_date,
            Price.date <= to_date,
        )
        .order_by(Price.date.asc())
        .all()
    )

    return jsonify({
        "symbol": stock.symbol,
        "name": stock.name,
        "from": from_date.isoformat(),
        "to": to_date.isoformat(),
        "prices": [bar.to_dict() for bar in bars],
    }), 200
