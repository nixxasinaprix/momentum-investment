"""Load Nifty 200 constituents from backend/data/nifty200.csv into the stocks table."""

import csv
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

DEFAULT_CSV_PATH = os.path.join(BACKEND_DIR, "data", "nifty200.csv")


def normalize_ns_symbol(symbol: str) -> str:
    """Ensure an NSE ticker ends with '.NS' in uppercase."""
    clean = symbol.strip().upper()
    return clean if clean.endswith(".NS") else f"{clean}.NS"


def upsert_universe(csv_path: str = DEFAULT_CSV_PATH) -> tuple[int, int]:
    """Read constituents CSV and upsert rows into the stocks table."""
    from models import Stock, db

    if not os.path.exists(csv_path):
        raise FileNotFoundError(
            f"Universe CSV not found at {csv_path}. "
            "Download ind_nifty200list.csv from niftyindices.com and save it there."
        )

    inserted = 0
    updated = 0

    with open(csv_path, mode="r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            raw_symbol = (row.get("Symbol") or "").strip()
            if not raw_symbol:
                continue

            symbol = normalize_ns_symbol(raw_symbol)
            name = (row.get("Company Name") or raw_symbol).strip()
            sector = (row.get("Industry") or "").strip() or None

            stock = Stock.query.filter_by(symbol=symbol).first()
            if stock is None:
                db.session.add(
                    Stock(symbol=symbol, name=name, sector=sector, is_active=True)
                )
                inserted += 1
            else:
                stock.name = name
                stock.sector = sector
                stock.is_active = True
                updated += 1

    db.session.commit()
    return inserted, updated


if __name__ == "__main__":
    from server import app

    with app.app_context():
        added, modified = upsert_universe()
        print(f"Universe loaded: {added} inserted, {modified} updated.")
