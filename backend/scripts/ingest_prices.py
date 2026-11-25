"""
Daily adjusted OHLCV price ingestion script for the Nifty 200 universe.

Usage (from /backend):
    python -m scripts.ingest_prices --full
    python -m scripts.ingest_prices --incremental
    python -m scripts.ingest_prices --full --symbols RELIANCE.NS TCS.NS
"""

import argparse
from datetime import date, timedelta
import math
import os
import sys
import time

import pandas as pd
from sqlalchemy import func
import yfinance as yf

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from models import Price, Stock, db  # noqa: E402
from scripts.load_universe import normalize_ns_symbol, upsert_universe  # noqa: E402

HISTORY_DAYS = 6 * 365 + 2
DEFAULT_BATCH_SIZE = 20
BATCH_DELAY_SECONDS = 0.5
MAX_RETRIES = 3
MIN_HISTORY_ROWS = 1000


def _to_float(value) -> float | None:
    if value is None or pd.isna(value):
        return None
    num = float(value)
    return num if math.isfinite(num) else None


def _to_int(value) -> int | None:
    if value is None or pd.isna(value):
        return None
    num = float(value)
    return int(num) if math.isfinite(num) else None


def clean_ticker_frame(df: pd.DataFrame) -> list[dict]:
    """Convert a yfinance OHLCV DataFrame into cleaned, date-deduplicated dicts."""
    if df is None or df.empty:
        return []

    rows_by_date: dict[date, dict] = {}
    for idx, row in df.iterrows():
        close = _to_float(row.get("Close"))
        if close is None or close <= 0:
            continue

        bar_date = idx.date() if hasattr(idx, "date") else pd.to_datetime(idx).date()
        rows_by_date[bar_date] = {
            "date": bar_date,
            "open": _to_float(row.get("Open")),
            "high": _to_float(row.get("High")),
            "low": _to_float(row.get("Low")),
            "close": close,
            "volume": _to_int(row.get("Volume")),
        }

    return [rows_by_date[d] for d in sorted(rows_by_date)]


def upsert_prices(stock_id: int, rows: list[dict]) -> int:
    """
    Idempotently upsert cleaned daily bars for one stock.

    Returns the number of newly inserted rows (existing dates are updated in place
    so re-running never produces duplicate (stock_id, date) rows).
    """
    if not rows:
        return 0

    min_date = min(r["date"] for r in rows)
    max_date = max(r["date"] for r in rows)

    existing_rows = Price.query.filter(
        Price.stock_id == stock_id,
        Price.date >= min_date,
        Price.date <= max_date,
    ).all()
    existing_by_date = {p.date: p for p in existing_rows}

    inserted = 0
    new_objects = []

    for row in rows:
        existing = existing_by_date.get(row["date"])
        if existing is None:
            new_objects.append(
                Price(
                    stock_id=stock_id,
                    date=row["date"],
                    open=row["open"],
                    high=row["high"],
                    low=row["low"],
                    close=row["close"],
                    volume=row["volume"],
                )
            )
            inserted += 1
        else:
            existing.open = row["open"]
            existing.high = row["high"]
            existing.low = row["low"]
            existing.close = row["close"]
            existing.volume = row["volume"]

    if new_objects:
        db.session.add_all(new_objects)
    db.session.commit()
    return inserted


def _extract_ticker_frame(data: pd.DataFrame, symbol: str, batch_len: int) -> pd.DataFrame | None:
    """Extract a single symbol's OHLCV DataFrame from yfinance output."""
    if data is None or data.empty:
        return None

    if isinstance(data.columns, pd.MultiIndex):
        if symbol in data.columns.get_level_values(0):
            return data[symbol]
        if symbol in data.columns.get_level_values(1):
            return data.xs(symbol, level=1, axis=1)
        return None

    if batch_len == 1:
        return data

    return None


def _download_batch(tickers: list[str], start_date: date, end_date: date) -> pd.DataFrame | None:
    """Download adjusted OHLCV data for a ticker batch with retries."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            # auto_adjust=True adjusts historical OHLC for splits and dividends
            # so corporate actions do not create fake price jumps.
            data = yf.download(
                tickers=tickers,
                start=start_date.isoformat(),
                end=end_date.isoformat(),
                auto_adjust=True,
                group_by="ticker",
                progress=False,
                threads=True,
            )
            if data is not None and not data.empty:
                return data
        except Exception as exc:
            print(f"  Attempt {attempt}/{MAX_RETRIES} failed for batch: {exc}")

        if attempt < MAX_RETRIES:
            time.sleep(2 ** (attempt - 1))

    return None


def ingest(mode: str, symbols: list[str] | None = None, batch_size: int = DEFAULT_BATCH_SIZE) -> dict:
    """Run full or incremental price ingestion and print a summary."""
    added_stocks, updated_stocks = upsert_universe()
    print(f"Universe synced from CSV ({added_stocks} new, {updated_stocks} updated).")

    query = Stock.query.filter_by(is_active=True).order_by(Stock.symbol.asc())
    if symbols:
        normalized = [normalize_ns_symbol(s) for s in symbols]
        query = query.filter(Stock.symbol.in_(normalized))

    stocks = query.all()
    if not stocks:
        print("No matching active stocks found.")
        return {"stocks_processed": 0, "rows_inserted": 0, "failed": [], "short_history": []}

    today = date.today()
    end_date = today + timedelta(days=1)
    default_start = today - timedelta(days=HISTORY_DAYS)

    latest_dates: dict[int, date | None] = {}
    if mode == "incremental":
        rows = (
            db.session.query(Price.stock_id, func.max(Price.date))
            .filter(Price.stock_id.in_([s.id for s in stocks]))
            .group_by(Price.stock_id)
            .all()
        )
        latest_dates = {stock_id: max_d for stock_id, max_d in rows}

    work_items: list[tuple[Stock, date, date | None]] = []
    for stock in stocks:
        max_stored = latest_dates.get(stock.id) if mode == "incremental" else None
        fetch_start = (max_stored + timedelta(days=1)) if max_stored else default_start
        if fetch_start <= today:
            work_items.append((stock, fetch_start, max_stored))

    total_inserted = 0
    failed_tickers: list[str] = []
    total_batches = math.ceil(len(work_items) / batch_size) if work_items else 0

    for batch_idx in range(total_batches):
        batch = work_items[batch_idx * batch_size : (batch_idx + 1) * batch_size]
        tickers = [stock.symbol for stock, _, _ in batch]
        batch_start = min(start for _, start, _ in batch)

        print(
            f"[Batch {batch_idx + 1}/{total_batches}] Downloading {len(tickers)} tickers "
            f"from {batch_start.isoformat()}..."
        )

        data = _download_batch(tickers, batch_start, end_date)
        if data is None:
            print(f"  Batch {batch_idx + 1} returned no data.")
            failed_tickers.extend(tickers)
        else:
            for stock, _, max_stored in batch:
                ticker_df = _extract_ticker_frame(data, stock.symbol, len(tickers))
                cleaned = clean_ticker_frame(ticker_df)
                if max_stored is not None:
                    cleaned = [r for r in cleaned if r["date"] > max_stored]

                if not cleaned:
                    if mode == "full" or max_stored is None:
                        failed_tickers.append(stock.symbol)
                    continue

                inserted = upsert_prices(stock.id, cleaned)
                total_inserted += inserted

        if batch_idx + 1 < total_batches:
            time.sleep(BATCH_DELAY_SECONDS)

    count_rows = (
        db.session.query(Price.stock_id, func.count(Price.id))
        .filter(Price.stock_id.in_([s.id for s in stocks]))
        .group_by(Price.stock_id)
        .all()
    )
    counts_by_id = {stock_id: cnt for stock_id, cnt in count_rows}
    short_history = [
        (s.symbol, counts_by_id.get(s.id, 0))
        for s in stocks
        if counts_by_id.get(s.id, 0) < MIN_HISTORY_ROWS
    ]

    print("\n=== Ingestion Summary ===")
    print(f"Mode: {mode}")
    print(f"Stocks processed: {len(stocks)}")
    print(f"Rows inserted: {total_inserted}")
    print(f"Failed / no data ({len(failed_tickers)}): {failed_tickers}")
    print(f"Under {MIN_HISTORY_ROWS} rows ({len(short_history)}): {short_history}")

    return {
        "stocks_processed": len(stocks),
        "rows_inserted": total_inserted,
        "failed": failed_tickers,
        "short_history": short_history,
    }


def main():
    parser = argparse.ArgumentParser(description="Ingest NSE daily prices via yfinance.")
    mode_group = parser.add_mutually_exclusive_group(required=True)
    mode_group.add_argument("--full", action="store_true", help="Fetch ~6 years of history.")
    mode_group.add_argument(
        "--incremental",
        action="store_true",
        help="Fetch only dates after each stock's latest stored date.",
    )
    parser.add_argument(
        "--symbols",
        nargs="+",
        help="Optional subset of symbols for testing (e.g. RELIANCE.NS TCS.NS).",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Tickers per yfinance batch (default: {DEFAULT_BATCH_SIZE}).",
    )
    args = parser.parse_args()

    from server import app

    mode = "full" if args.full else "incremental"
    with app.app_context():
        ingest(mode=mode, symbols=args.symbols, batch_size=args.batch_size)


if __name__ == "__main__":
    main()
