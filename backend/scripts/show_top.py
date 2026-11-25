"""
CLI sanity script to print the top momentum-ranked stocks for a date and method.

Usage (from /backend):
    python -m scripts.show_top
    python -m scripts.show_top --method raw
    python -m scripts.show_top --as-of 2026-11-25 --method vol_adjusted --top 20
"""

import argparse
from datetime import date
import os
import sys

from sqlalchemy import func

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from data_access import load_price_matrix  # noqa: E402
from models import Price, Stock, db  # noqa: E402
from server import app  # noqa: E402
from signals import (  # noqa: E402
    ALLOWED_METHODS,
    compute_scores,
    resolve_effective_as_of,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Print the top momentum stocks from the local database."
    )
    parser.add_argument(
        "--as-of",
        type=str,
        default=None,
        help="Target date in YYYY-MM-DD format (defaults to latest date in DB).",
    )
    parser.add_argument(
        "--method",
        choices=ALLOWED_METHODS,
        default="vol_adjusted",
        help="Scoring method (default: vol_adjusted).",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=20,
        help="Number of top stocks to display (default: 20).",
    )
    parser.add_argument(
        "--lookback",
        type=int,
        default=252,
        help="Trading-day lookback horizon (default: 252).",
    )
    parser.add_argument(
        "--skip",
        type=int,
        default=21,
        help="Recent trading days skipped from momentum end price (default: 21).",
    )
    return parser.parse_args()


def _truncate(text: str | None, width: int) -> str:
    value = text or "-"
    return value if len(value) <= width else value[: width - 1] + "…"


def main() -> None:
    args = parse_args()

    with app.app_context():
        if args.as_of:
            requested_as_of = date.fromisoformat(args.as_of)
        else:
            latest = db.session.query(func.max(Price.date)).scalar()
            if latest is None:
                print("No price data found in the database.")
                return
            requested_as_of = latest

        prices = load_price_matrix(db.session, start=None, end=requested_as_of)
        effective_ts = resolve_effective_as_of(prices, requested_as_of)
        if effective_ts is None:
            print(f"No trading data on or before {requested_as_of.isoformat()}.")
            return

        scores = compute_scores(
            prices,
            as_of=requested_as_of,
            method=args.method,
            lookback_days=args.lookback,
            skip_days=args.skip,
        )
        top_df = scores.head(args.top)

        stock_meta = {
            s.symbol: (s.name, s.sector)
            for s in Stock.query.filter_by(is_active=True).all()
        }

        print(
            f"\nTop {len(top_df)} Momentum Stocks | "
            f"as_of={effective_ts.date().isoformat()} | "
            f"method={args.method} | lookback={args.lookback} | skip={args.skip} | "
            f"eligible={len(scores)}"
        )
        header = (
            f"{'Rank':>4}  {'Symbol':<14}  {'Name':<28}  {'Sector':<24}  "
            f"{'Momentum':>9}  {'Vol(Ann)':>9}  {'Score':>9}"
        )
        print("-" * len(header))
        print(header)
        print("-" * len(header))

        for row in top_df.itertuples(index=False):
            name, sector = stock_meta.get(row.symbol, (row.symbol, None))
            mom_str = f"{row.momentum * 100:>8.2f}%"
            vol_str = f"{row.volatility * 100:>8.2f}%" if row.volatility == row.volatility else f"{'N/A':>9}"
            print(
                f"{int(row.rank):>4}  {row.symbol:<14}  "
                f"{_truncate(name, 28):<28}  {_truncate(sector, 24):<24}  "
                f"{mom_str}  {vol_str}  {row.score:>9.4f}"
            )
        print()


if __name__ == "__main__":
    main()
