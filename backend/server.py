import os
import time
import threading
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from auth import auth_bp  # noqa: E402
from backtest_routes import backtest_bp  # noqa: E402
from market_routes import market_bp  # noqa: E402
from models import db, ensure_schema_columns  # noqa: E402
from pipeline_routes import pipeline_bp  # noqa: E402
from research_routes import research_bp  # noqa: E402
from signals_routes import signals_bp  # noqa: E402
import market_data  # noqa: E402

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///momentum.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

CORS(app, allow_headers=["Content-Type", "Authorization"])
db.init_app(app)
app.register_blueprint(auth_bp)
app.register_blueprint(backtest_bp)
app.register_blueprint(market_bp)
app.register_blueprint(pipeline_bp)
app.register_blueprint(research_bp)
app.register_blueprint(signals_bp)

with app.app_context():
    db.create_all()
    ensure_schema_columns()

# ═══════════════════════════════════════════════════════
# 📦 BASELINE / SEED DATA
# ═══════════════════════════════════════════════════════
DEFAULT_INDEX = {
    "name": "NIFTY 500",
    "symbol": "^CRSLDX",
    "last": 24088.80,
    "change": 191.65,
    "pChange": 0.80,
    "previousClose": 23897.15,
    "open": 23750.80,
    "high": 24089.05,
    "low": 23722.75,
    "_source": "fallback",
    "isFallback": True
}

DEFAULT_DETAILS = {
    "index": DEFAULT_INDEX,
    "topGainers": [
        {"symbol": "RELIANCE", "name": "Reliance Industries", "last": 1377.50, "change": 8.50, "pChange": 0.62},
        {"symbol": "TCS", "name": "Tata Consultancy Services", "last": 4120.30, "change": 38.90, "pChange": 0.95},
        {"symbol": "INFY", "name": "Infosys", "last": 1850.75, "change": 15.20, "pChange": 0.83},
        {"symbol": "HDFCBANK", "name": "HDFC Bank", "last": 1680.55, "change": 12.35, "pChange": 0.74},
        {"symbol": "YESBANK", "name": "Yes Bank", "last": 17.91, "change": 0.15, "pChange": 0.84},
    ],
    "topLosers": [
        {"symbol": "ADANIENT", "name": "Adani Enterprises", "last": 3120.85, "change": -42.15, "pChange": -1.33},
        {"symbol": "SBIN", "name": "State Bank of India", "last": 825.30, "change": -8.60, "pChange": -1.03},
        {"symbol": "MARUTI", "name": "Maruti Suzuki", "last": 12450.20, "change": -110.80, "pChange": -0.88},
        {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank", "last": 1745.10, "change": -10.25, "pChange": -0.58},
        {"symbol": "ITC", "name": "ITC Limited", "last": 465.20, "change": -1.85, "pChange": -0.40},
    ],
    "_source": "fallback",
    "isFallback": True
}

# Pre-seed cache so all endpoints respond instantaneously from the first call
market_data.save_to_cache("nifty500_index", DEFAULT_INDEX, ttl=3600)
market_data.save_to_cache("nifty500_details", DEFAULT_DETAILS, ttl=3600)


# ═══════════════════════════════════════════════════════
# 🔄 BACKGROUND REFRESH WORKER (Non-blocking)
# ═══════════════════════════════════════════════════════
def background_market_worker():
    """Fetches live quotes in the background so HTTP requests never wait or timeout."""
    while True:
        try:
            index = market_data.get_index_data()
            if index:
                index["_source"] = "live_market"
                market_data.save_to_cache("nifty500_index", index, ttl=180)

            stocks = market_data.get_stock_data()
            if stocks and index:
                sorted_stocks = sorted(stocks, key=lambda x: x["pChange"], reverse=True)
                details = {
                    "index": index,
                    "topGainers": sorted_stocks[:5],
                    "topLosers": sorted(sorted_stocks, key=lambda x: x["pChange"])[:5],
                    "_source": "live_market"
                }
                market_data.save_to_cache("nifty500_details", details, ttl=180)
                print("✅ Background worker: Live market data updated successfully.")
        except Exception as e:
            print(f"ℹ️ Background worker note: {e}")

        time.sleep(60)


# ═══════════════════════════════════════════════════════
# 🌐 ROUTES
# ═══════════════════════════════════════════════════════
@app.route("/")
def home():
    cache_mode = "Redis ✅" if market_data.REDIS_AVAILABLE else "In-Memory Fallback ⚡ (Redis server offline)"
    return (
        f"<h1>Momentum Investment API</h1>"
        f"<p>Cache: {cache_mode}</p>"
        f"<p>"
        f"<a href='/api/nifty500'>/api/nifty500</a> | "
        f"<a href='/api/nifty500-details'>/api/nifty500-details</a> | "
        f"<a href='/api/cache-status'>/api/cache-status</a>"
        f"</p>"
    )


@app.route("/api/cache-status")
def cache_status():
    """Lets you verify whether Redis or In-Memory caching is active."""
    return jsonify({
        "redisConnected": market_data.REDIS_AVAILABLE,
        "cacheMode": "redis" if market_data.REDIS_AVAILABLE else "in-memory",
        "cacheTTL": market_data.CACHE_TTL,
        "message": "Connected to Redis server" if market_data.REDIS_AVAILABLE
                   else "Using in-memory cache fallback (start Redis on port 6379 to use Redis)"
    })


@app.route("/api/nifty500")
def get_nifty_500():
    cached = market_data.get_from_cache("nifty500_index")
    if cached:
        return jsonify(cached)
    return jsonify(DEFAULT_INDEX)


@app.route("/api/nifty500-details")
def nifty500_details():
    cached = market_data.get_from_cache("nifty500_details")
    if cached:
        return jsonify(cached)
    return jsonify(DEFAULT_DETAILS)


if __name__ == "__main__":
    # Start the background refresh daemon only when running server
    threading.Thread(target=background_market_worker, daemon=True).start()
    app.run(port=8000, debug=True)
