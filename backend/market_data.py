"""
market_data.py - Live NSE Market Data Fetcher & Redis/Memory Cache Library
Supports live index tracking (NIFTY 500, NIFTY 50) and active NSE stocks
with Redis caching and automatic in-memory fallback.
"""

import json
import time
import yfinance as yf

# ═══════════════════════════════════════════════════════
# 🔴 REDIS / IN-MEMORY CACHE SETUP
# ═══════════════════════════════════════════════════════
CACHE_TTL = 60  # seconds

cache = None
REDIS_AVAILABLE = False
_in_memory_cache = {}

try:
    import redis
    cache = redis.Redis(
        host="localhost",
        port=6379,
        db=0,
        decode_responses=True,
        socket_connect_timeout=0.3
    )
    cache.ping()
    REDIS_AVAILABLE = True
    print("✅ Redis connected — caching ENABLED (60s TTL)")
except Exception:
    cache = None
    REDIS_AVAILABLE = False
    print("ℹ️  Redis server not active — using fast In-Memory cache fallback (60s TTL)")


def get_from_cache(key):
    """Retrieve item from Redis or In-Memory fallback cache."""
    if REDIS_AVAILABLE and cache is not None:
        try:
            val = cache.get(key)
            if val:
                return json.loads(val)
        except Exception:
            pass

    # Check In-Memory fallback
    if key in _in_memory_cache:
        data, expiry = _in_memory_cache[key]
        if time.time() < expiry:
            return data
        else:
            del _in_memory_cache[key]

    return None


def save_to_cache(key, data, ttl=CACHE_TTL):
    """Store item in Redis and/or In-Memory fallback cache."""
    if REDIS_AVAILABLE and cache is not None:
        try:
            cache.setex(key, ttl, json.dumps(data))
        except Exception:
            pass

    # Always keep in-memory backup
    _in_memory_cache[key] = (data, time.time() + ttl)


# ═══════════════════════════════════════════════════════
# 📊 NSE MARKET DATA FETCHERS
# ═══════════════════════════════════════════════════════
NIFTY500_MAJORS = {
    "RELIANCE": "Reliance Industries",
    "HDFCBANK": "HDFC Bank",
    "ICICIBANK": "ICICI Bank",
    "TCS": "Tata Consultancy Services",
    "INFY": "Infosys",
    "SBIN": "State Bank of India",
    "BHARTIARTL": "Bharti Airtel",
    "HINDUNILVR": "Hindustan Unilever",
    "KOTAKBANK": "Kotak Mahindra Bank",
    "ITC": "ITC Limited",
    "LT": "Larsen & Toubro",
    "AXISBANK": "Axis Bank",
    "BAJFINANCE": "Bajaj Finance",
    "MARUTI": "Maruti Suzuki",
    "SUNPHARMA": "Sun Pharma",
    "TITAN": "Titan Company",
    "ADANIENT": "Adani Enterprises",
    "ADANIPORTS": "Adani Ports",
    "HCLTECH": "HCL Technologies",
    "YESBANK": "Yes Bank",
}


def get_index_data():
    """
    Fetch live NIFTY 500 data.
    Yahoo Finance symbol for NIFTY 500 is '^CRSLDX' (the old '^CNX500' is deprecated/404).
    Falls back to '^NSEI' (NIFTY 50) if needed.
    """
    # Try NIFTY 500 (^CRSLDX), then NIFTY 50 (^NSEI)
    candidates = [
        ("^CRSLDX", "NIFTY 500"),
        ("^NSEI", "NIFTY 50")
    ]
    for sym, name in candidates:
        try:
            ticker = yf.Ticker(sym)
            hist = ticker.history(period="2d")
            if not hist.empty and len(hist) >= 1:
                current = float(hist["Close"].iloc[-1])
                prev = float(hist["Close"].iloc[-2]) if len(hist) > 1 else float(hist["Open"].iloc[-1])
                change = current - prev
                return {
                    "name": name,
                    "symbol": sym,
                    "last": round(current, 2),
                    "change": round(change, 2),
                    "pChange": round((change / prev) * 100, 2),
                    "previousClose": round(prev, 2),
                    "open": round(float(hist["Open"].iloc[-1]), 2),
                    "high": round(float(hist["High"].iloc[-1]), 2),
                    "low": round(float(hist["Low"].iloc[-1]), 2),
                }
        except Exception as e:
            print(f"Warning: Failed to fetch index {sym}: {e}")
            continue

    raise ValueError("Could not retrieve live index data from Yahoo Finance")


def get_stock_data():
    """Fetch live quote and performance metrics for major NSE stocks."""
    symbols = list(NIFTY500_MAJORS.keys())
    tickers = [s + ".NS" for s in symbols]
    
    try:
        data = yf.download(tickers, period="2d", group_by="ticker", progress=False, threads=True)
    except Exception as e:
        print(f"Error downloading stock batch: {e}")
        data = None

    stocks = []
    if data is not None and not data.empty:
        for s in symbols:
            try:
                ticker_key = s + ".NS"
                if ticker_key not in data:
                    continue
                df = data[ticker_key].dropna(subset=["Close"])
                if df.empty:
                    continue
                last = float(df["Close"].iloc[-1])
                prev = float(df["Close"].iloc[-2]) if len(df) > 1 else float(df["Open"].iloc[-1])
                change = last - prev
                stocks.append({
                    "symbol": s,
                    "name": NIFTY500_MAJORS[s],
                    "last": round(last, 2),
                    "change": round(change, 2),
                    "pChange": round((change / prev) * 100, 2),
                })
            except Exception:
                continue

    return stocks


if __name__ == "__main__":
    print("Testing market_data library...")
    idx = get_index_data()
    print("Index data:", idx)
    save_to_cache("test_index", idx)
    cached = get_from_cache("test_index")
    print("Retrieved from cache:", cached["name"], cached["last"])
    stocks = get_stock_data()
    print(f"Fetched {len(stocks)} stocks successfully.")
