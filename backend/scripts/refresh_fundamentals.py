"""
Weekly fundamental snapshot refresher for Nifty 500 stocks.

Fetches market cap (INR) via yfinance, caches it in ``stocks.market_cap``
with ``stocks.last_updated``, and skips rows refreshed within ``--max-age-days``
(default: 7 days) unless ``--force`` is provided.

Usage (from /backend):
    python -m scripts.refresh_fundamentals
    python -m scripts.refresh_fundamentals --force
    python -m scripts.refresh_fundamentals --max-age-days 7 --workers 8
"""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
import math
import os
import sys

import yfinance as yf

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from models import Stock, db, ensure_schema_columns  # noqa: E402


def _fetch_one_market_cap(symbol: str) -> tuple[str, float | None, str | None]:
    """Fetch marketCap (INR) and optional sector fallback for one NSE symbol."""
    try:
        ticker = yf.Ticker(symbol)
        mcap = None
        try:
            fast = ticker.fast_info
            raw_mcap = fast.get("marketCap") if hasattr(fast, "get") else getattr(fast, "market_cap", None)
            if raw_mcap is not None and math.isfinite(float(raw_mcap)) and float(raw_mcap) > 0:
                mcap = float(raw_mcap)
        except Exception:
            mcap = None

        sector = None
        if mcap is None:
            info = ticker.info or {}
            raw_info_mcap = info.get("marketCap")
            if raw_info_mcap is not None and math.isfinite(float(raw_info_mcap)) and float(raw_info_mcap) > 0:
                mcap = float(raw_info_mcap)
            sector = info.get("sector") or None

        return symbol, mcap, sector
    except Exception:
        return symbol, None, None


def refresh_fundamentals(
    force: bool = False,
    max_age_days: int = 7,
    workers: int = 8,
    symbols: list[str] | None = None,
) -> dict:
    """Refresh market_cap and last_updated for stale or missing active stocks."""
    ensure_schema_columns()
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=max_age_days)

    query = Stock.query.filter_by(is_active=True).order_by(Stock.symbol.asc())
    if symbols:
        normalized = [s.strip().upper() if s.strip().upper().endswith(".NS") else f"{s.strip().upper()}.NS" for s in symbols]
        query = query.filter(Stock.symbol.in_(normalized))

    all_active = query.all()
    stale = []
    for s in all_active:
        if force or s.last_updated is None:
            stale.append(s)
        else:
            lu = s.last_updated
            if lu.tzinfo is None:
                lu = lu.replace(tzinfo=timezone.utc)
            if lu < cutoff:
                stale.append(s)

    print(
        f"Refreshing fundamentals: {len(stale)} stale/missing out of {len(all_active)} active stocks "
        f"(max_age_days={max_age_days}, force={force})."
    )
    if not stale:
        return {"checked": len(all_active), "updated": 0, "unknown": 0}

    by_symbol = {s.symbol: s for s in stale}
    updated = 0
    unknown = 0

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_fetch_one_market_cap, sym): sym for sym in by_symbol}
        for idx, fut in enumerate(as_completed(futures), start=1):
            sym, mcap, sec_fallback = fut.result()
            stock = by_symbol[sym]
            stock.market_cap = mcap
            if not stock.sector and sec_fallback:
                stock.sector = sec_fallback
            stock.last_updated = now
            if mcap is not None:
                updated += 1
            else:
                unknown += 1
            if idx % 50 == 0 or idx == len(by_symbol):
                db.session.commit()
                print(f"  Progress: {idx}/{len(by_symbol)} (known={updated}, unknown={unknown})")

    db.session.commit()
    print(f"Fundamentals refresh complete: {updated} market caps cached, {unknown} marked unknown.")
    return {"checked": len(all_active), "updated": updated, "unknown": unknown}


def main():
    parser = argparse.ArgumentParser(description="Refresh cached stock market caps via yfinance.")
    parser.add_argument("--force", action="store_true", help="Refresh all active stocks regardless of age.")
    parser.add_argument("--max-age-days", type=int, default=7, help="Cache freshness window in days (default: 7).")
    parser.add_argument("--workers", type=int, default=8, help="Concurrent yfinance threads (default: 8).")
    parser.add_argument("--symbols", nargs="+", help="Optional subset of symbols.")
    args = parser.parse_args()

    from server import app

    with app.app_context():
        refresh_fundamentals(
            force=args.force,
            max_age_days=args.max_age_days,
            workers=args.workers,
            symbols=args.symbols,
        )


if __name__ == "__main__":
    main()
