"""
Idempotent daily market data & fundamentals update job.

Runs safely on any schedule (or twice in a row) after NSE market close:
    1. Incremental stock price ingestion (Nifty 500)
    2. Incremental benchmark price ingestion (^CNX200)
    3. Fundamentals snapshot refresh (only for rows older than 7 days)
    4. Clears in-memory research & pipeline caches

Usage (from /backend):
    python -m scripts.daily_update
"""

import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from pipeline_routes import clear_pipeline_cache  # noqa: E402
from research_routes import clear_research_cache  # noqa: E402
from scripts.ingest_benchmark import ingest_benchmark  # noqa: E402
from scripts.ingest_prices import ingest  # noqa: E402
from scripts.refresh_fundamentals import refresh_fundamentals  # noqa: E402


def run_daily_update(max_age_days: int = 7) -> dict:
    """Execute incremental prices, benchmark, weekly fundamentals, and cache clear."""
    price_res = ingest(mode="incremental")
    bench_res = ingest_benchmark(mode="incremental")
    fund_res = refresh_fundamentals(force=False, max_age_days=max_age_days)

    clear_research_cache()
    clear_pipeline_cache()

    summary = {
        "prices": price_res,
        "benchmark": bench_res,
        "fundamentals": fund_res,
        "caches_cleared": True,
    }
    print("\n=== Daily Update Complete ===")
    print(f"Price rows inserted: {price_res['rows_inserted']}")
    print(f"Benchmark rows inserted: {bench_res['rows_inserted']}")
    print(
        f"Fundamentals refreshed: {fund_res['updated']} known, "
        f"{fund_res['unknown']} unknown (skipped fresh rows)"
    )
    print("In-memory pipeline & screener caches cleared.")
    return summary


def main():
    from server import app

    with app.app_context():
        run_daily_update()


if __name__ == "__main__":
    main()
