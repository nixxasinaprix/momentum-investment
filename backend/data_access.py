"""Database access helpers for loading price matrices."""

from datetime import date
import pandas as pd
from sqlalchemy.orm import Session

from models import Price, Stock


def load_price_matrix(
    session: Session,
    start: date | str | None = None,
    end: date | str | None = None,
    active_only: bool = True,
) -> pd.DataFrame:
    """
    Load daily adjusted close prices as a date-by-symbol DataFrame.

    Parameters
    ----------
    session : sqlalchemy.orm.Session
        Active SQLAlchemy session.
    start : date | str | None
        Optional inclusive start date filter.
    end : date | str | None
        Optional inclusive end date filter.
    active_only : bool
        When True (default), include only stocks with ``is_active=True``.

    Returns
    -------
    pd.DataFrame
        DataFrame with sorted ``DatetimeIndex`` dates, stock symbols as columns,
        and adjusted close prices (float64) as values.
    """
    start_date = date.fromisoformat(start) if isinstance(start, str) else start
    end_date = date.fromisoformat(end) if isinstance(end, str) else end

    query = session.query(Price.date, Stock.symbol, Price.close).join(
        Stock, Price.stock_id == Stock.id
    )
    if active_only:
        query = query.filter(Stock.is_active.is_(True))
    if start_date is not None:
        query = query.filter(Price.date >= start_date)
    if end_date is not None:
        query = query.filter(Price.date <= end_date)

    rows = query.order_by(Price.date.asc(), Stock.symbol.asc()).all()
    if not rows:
        return pd.DataFrame(index=pd.DatetimeIndex([], name="date"))

    raw = pd.DataFrame(rows, columns=["date", "symbol", "close"])
    matrix = raw.pivot(index="date", columns="symbol", values="close")
    matrix.index = pd.to_datetime(matrix.index)
    matrix.index.name = "date"
    matrix.columns.name = None
    return matrix.sort_index().astype(float)
