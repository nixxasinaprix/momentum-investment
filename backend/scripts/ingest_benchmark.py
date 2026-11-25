"""
Daily benchmark index price ingestion script (default: Nifty 200 '^CNX200').

Usage (from /backend):
    python -m scripts.ingest_benchmark
    python -m scripts.ingest_benchmark --incremental
    python -m scripts.ingest_benchmark --symbol ^NSEI --full
"""

import argparse
from datetime import date, timedelta
import math
import os
import sys

import pandas as pd
from sqlalchemy import func
import yfinance as yf

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from models import BenchmarkPrice, db  # noqa: E402

DEFAULT_BENCHMARK_SYMBOL = "^CNX200"
HISTORY_DAYS = 6 * 365 + 2


def clean_benchmark_frame(df: pd.DataFrame, symbol: str) -> list[dict]:
    """Convert yfinance output for a benchmark index into cleaned date/close dicts."""
    if df is None or df.empty:
        return []

    if isinstance(df.columns, pd.MultiIndex):
        if "Close" in df.columns.get_level_values(0):
            close_obj = df["Close"]
            close_series = (
                close_obj[symbol]
                if isinstance(close_obj, pd.DataFrame) and symbol in close_obj.columns
                else close_obj.iloc[:, 0]
                if isinstance(close_obj, pd.DataFrame)
                else close_obj
            )
        else:
            close_series = df.xs("Close", level=1, axis=1).iloc[:, 0]
    else:
        close_series = df["Close"]

    rows_by_date: dict[date, float] = {}
    for idx, val in close_series.items():
        if val is None or pd.isna(val):
            continue
        close = float(val)
        if not math.isfinite(close) or close <= 0:
            continue
        bar_date = idx.date() if hasattr(idx, "date") else pd.to_datetime(idx).date()
        rows_by_date[bar_date] = close

    return [
        {"date": d, "close": rows_by_date[d]}
        for d in sorted(rows_by_date)
    ]


def upsert_benchmark_prices(symbol: str, rows: list[dict]) -> int:
    """
    Idempotently upsert benchmark daily close prices for ``symbol``.

    Returns the number of newly inserted rows; existing dates are updated in place.
    """
    if not rows:
        return 0

    min_date = min(r["date"] for r in rows)
    max_date = max(r["date"] for r in rows)

    existing_rows = BenchmarkPrice.query.filter(
        BenchmarkPrice.symbol == symbol,
        BenchmarkPrice.date >= min_date,
        BenchmarkPrice.date <= max_date,
    ).all()
    existing_by_date = {r.date: r for r in existing_rows}

    inserted = 0
    new_objects = []
    for row in rows:
        existing = existing_by_date.get(row["date"])
        if existing is None:
            new_objects.append(
                BenchmarkPrice(symbol=symbol, date=row["date"], close=row["close"])
            )
            inserted += 1
        else:
            existing.close = row["close"]

    if new_objects:
        db.session.add_all(new_objects)
    db.session.commit()
    return inserted


def ingest_benchmark(symbol: str = DEFAULT_BENCHMARK_SYMBOL, mode: str = "full") -> dict:
    """Download and store benchmark close history in ``benchmark_prices``."""
    today = date.today()
    end_date = today + timedelta(days=1)
    default_start = today - timedelta(days=HISTORY_DAYS)

    max_stored = None
    if mode == "incremental":
        max_stored = (
            db.session.query(func.max(BenchmarkPrice.date))
            .filter(BenchmarkPrice.symbol == symbol)
            .scalar()
        )

    fetch_start = (max_stored + timedelta(days=1)) if max_stored else default_start
    inserted = 0

    if fetch_start <= today:
        raw = yf.download(
            tickers=symbol,
            start=fetch_start.isoformat(),
            end=end_date.isoformat(),
            auto_adjust=True,
            progress=False,
        )
        cleaned = clean_benchmark_frame(raw, symbol)
        if max_stored is not None:
            cleaned = [r for r in cleaned if r["date"] > max_stored]
        inserted = upsert_benchmark_prices(symbol, cleaned)

    total_rows, min_d, max_d = (
        db.session.query(
            func.count(BenchmarkPrice.id),
            func.min(BenchmarkPrice.date),
            func.max(BenchmarkPrice.date),
        )
        .filter(BenchmarkPrice.symbol == symbol)
        .one()
    )

    print("\n=== Benchmark Ingestion Summary ===")
    print(f"Symbol: {symbol}")
    print(f"Mode: {mode}")
    print(f"Rows inserted: {inserted}")
    print(f"Total rows in DB: {total_rows}")
    print(f"Date range: {min_d} to {max_d}")

    return {
        "symbol": symbol,
        "mode": mode,
        "rows_inserted": inserted,
        "total_rows": total_rows,
        "min_date": min_d.isoformat() if min_d else None,
        "max_date": max_d.isoformat() if max_d else None,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Ingest daily benchmark close prices via yfinance."
    )
    parser.add_argument(
        "--symbol",
        type=str,
        default=DEFAULT_BENCHMARK_SYMBOL,
        help=f"Benchmark ticker symbol (default: {DEFAULT_BENCHMARK_SYMBOL}).",
    )
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument(
        "--full", action="store_true", help="Fetch ~6 years of history (default)."
    )
    mode_group.add_argument(
        "--incremental",
        action="store_true",
        help="Fetch only dates after the latest stored benchmark date.",
    )
    args = parser.parse_args()

    from server import app

    mode = "incremental" if args.incremental else "full"
    with app.app_context():
        ingest_benchmark(symbol=args.symbol.strip(), mode=mode)


if __name__ == "__main__":
    main()
