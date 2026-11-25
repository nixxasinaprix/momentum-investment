"""
Pure pandas/numpy momentum signal engine.

This module intentionally has no Flask or database imports so it can be reused
directly by both live API routes and historical backtesting code.
"""

from datetime import date, datetime
import numpy as np
import pandas as pd

TRADING_DAYS_PER_YEAR = 252
ALLOWED_METHODS = ("vol_adjusted", "raw")
SCORE_COLUMNS = ["symbol", "momentum", "volatility", "score", "rank"]


def _slice_as_of(
    prices: pd.DataFrame, as_of: date | datetime | pd.Timestamp | str
) -> pd.DataFrame:
    """
    Return rows on or before ``as_of`` sorted chronologically.

    If ``as_of`` is not itself a trading day, the last available trading day on
    or before ``as_of`` naturally becomes the final row (no look-ahead).
    """
    if prices.empty:
        return prices

    frame = prices.copy()
    if not isinstance(frame.index, pd.DatetimeIndex):
        frame.index = pd.to_datetime(frame.index)
    if not frame.index.is_monotonic_increasing:
        frame = frame.sort_index()

    as_of_ts = pd.Timestamp(as_of).normalize()
    return frame.loc[frame.index.normalize() <= as_of_ts]


def _validate_window_params(lookback_days: int, skip_days: int) -> None:
    if lookback_days <= 0:
        raise ValueError("lookback_days must be positive.")
    if skip_days < 0:
        raise ValueError("skip_days must be non-negative.")
    if skip_days >= lookback_days:
        raise ValueError("skip_days must be strictly less than lookback_days.")


def resolve_effective_as_of(
    prices: pd.DataFrame, as_of: date | datetime | pd.Timestamp | str
) -> pd.Timestamp | None:
    """Return the last trading date on or before ``as_of``, or None if none exists."""
    sliced = _slice_as_of(prices, as_of)
    if sliced.empty:
        return None
    return pd.Timestamp(sliced.index[-1]).normalize()


def compute_momentum(
    prices: pd.DataFrame,
    as_of: date | datetime | pd.Timestamp | str,
    lookback_days: int = 252,
    skip_days: int = 21,
) -> pd.Series:
    """
    Compute trailing price momentum as of ``as_of`` using trading-day positions.

    Formula
    -------
    ``momentum = price[as_of - skip_days] / price[as_of - lookback_days] - 1``

    where indices are trading-day row offsets relative to the last trading day
    on or before ``as_of``. Rows after ``as_of`` are never read.

    Eligibility rules
    -----------------
    1. **Minimum history**: A stock must have at least
       ``lookback_days + skip_days`` non-null price rows strictly before the
       effective ``as_of`` trading day; otherwise its momentum is ``NaN``.
    2. **Valid endpoint prices**: Both ``price[as_of - skip_days]`` and
       ``price[as_of - lookback_days]`` must be present (non-NaN) and strictly
       positive; otherwise its momentum is ``NaN``.
    3. **Non-trading-day handling**: If ``as_of`` falls on a non-trading day,
       the most recent trading day on or before ``as_of`` is used.
    """
    _validate_window_params(lookback_days, skip_days)

    sliced = _slice_as_of(prices, as_of)
    if sliced.empty or len(sliced) <= lookback_days + skip_days:
        return pd.Series(np.nan, index=prices.columns, dtype=float, name="momentum")

    # Rule 1: require at least lookback_days + skip_days valid observations before as_of.
    history_before = sliced.iloc[:-1].notna().sum(axis=0)
    eligible_history = history_before >= (lookback_days + skip_days)

    end_prices = sliced.iloc[-1 - skip_days].astype(float)
    start_prices = sliced.iloc[-1 - lookback_days].astype(float)

    # Rule 2: both needed positions must be present and positive.
    valid_prices = (
        end_prices.notna()
        & start_prices.notna()
        & (end_prices > 0.0)
        & (start_prices > 0.0)
    )

    momentum = pd.Series(np.nan, index=sliced.columns, dtype=float, name="momentum")
    mask = eligible_history & valid_prices
    momentum.loc[mask] = (end_prices.loc[mask] / start_prices.loc[mask]) - 1.0
    return momentum


def compute_volatility(
    prices: pd.DataFrame,
    as_of: date | datetime | pd.Timestamp | str,
    window: int = 252,
) -> pd.Series:
    """
    Compute annualised daily return volatility over ``window`` trading days up to ``as_of``.

    Uses only rows on or before ``as_of``. Daily percentage returns are computed
    without forward-filling missing prices, and sample standard deviation
    (``ddof=1``) over the trailing ``window`` return rows is annualised by
    ``sqrt(252)``. Stocks with fewer than ``max(2, int(window * 0.8))`` valid
    daily returns in the window receive ``NaN``.
    """
    if window < 2:
        raise ValueError("window must be at least 2.")

    sliced = _slice_as_of(prices, as_of)
    if sliced.empty or len(sliced) < 3:
        return pd.Series(np.nan, index=prices.columns, dtype=float, name="volatility")

    daily_returns = (sliced / sliced.shift(1)) - 1.0
    window_returns = daily_returns.iloc[-window:]

    min_valid_returns = max(2, int(window * 0.8))
    valid_counts = window_returns.notna().sum(axis=0)

    vol = window_returns.std(axis=0, ddof=1) * np.sqrt(TRADING_DAYS_PER_YEAR)
    vol = vol.where(valid_counts >= min_valid_returns)
    vol.name = "volatility"
    return vol.astype(float)


def compute_scores(
    prices: pd.DataFrame,
    as_of: date | datetime | pd.Timestamp | str,
    method: str = "vol_adjusted",
    lookback_days: int = 252,
    skip_days: int = 21,
) -> pd.DataFrame:
    """
    Compute momentum scores and deterministic rankings across the stock universe.

    Parameters
    ----------
    prices : pd.DataFrame
        Date-indexed price matrix with symbols as columns.
    as_of : date | datetime | pd.Timestamp | str
        Evaluation date. Only rows on or before ``as_of`` are used.
    method : {"vol_adjusted", "raw"}
        ``"vol_adjusted"`` scores stocks by ``momentum / volatility``;
        ``"raw"`` scores stocks by ``momentum`` directly.
    lookback_days : int
        Trading-day lookback horizon for momentum and volatility window.
    skip_days : int
        Recent trading days skipped from the momentum end price.

    Eligibility & Ranking Rules
    ---------------------------
    1. **No look-ahead**: Only rows with date ``<= as_of`` (falling back to the
       last trading day on or before ``as_of``) are used.
    2. **Minimum history**: Stocks with fewer than ``lookback_days + skip_days``
       non-null rows strictly before the effective ``as_of`` date are excluded.
    3. **Missing positions**: Stocks missing a valid positive price at either
       ``as_of - skip_days`` or ``as_of - lookback_days`` are excluded.
    4. **NaN / zero-vol exclusion**: Stocks with ``NaN`` momentum, ``NaN`` score,
       or non-positive volatility (under ``vol_adjusted``) are dropped rather
       than filled.
    5. **Strict ranking**: Eligible stocks are sorted by ``score`` descending
       with alphabetical ``symbol`` tie-breaking, producing unique integer ranks
       ``1..N`` (``1 = best``).
    """
    if method not in ALLOWED_METHODS:
        raise ValueError(
            f"Invalid method '{method}'. Expected one of {ALLOWED_METHODS}."
        )
    _validate_window_params(lookback_days, skip_days)

    sliced = _slice_as_of(prices, as_of)
    if sliced.empty:
        return pd.DataFrame(columns=SCORE_COLUMNS)

    momentum = compute_momentum(
        sliced, as_of, lookback_days=lookback_days, skip_days=skip_days
    )
    volatility = compute_volatility(sliced, as_of, window=lookback_days)

    if method == "vol_adjusted":
        valid_vol = volatility.where(volatility > 0.0)
        score = momentum / valid_vol
    else:
        score = momentum.copy()

    result = pd.DataFrame(
        {
            "symbol": sliced.columns.astype(str),
            "momentum": momentum.to_numpy(dtype=float),
            "volatility": volatility.to_numpy(dtype=float),
            "score": score.to_numpy(dtype=float),
        }
    )

    # Exclude (do not fill) stocks with NaN scores or non-finite values.
    result = result.loc[np.isfinite(result["score"])].copy()
    if result.empty:
        return pd.DataFrame(columns=SCORE_COLUMNS)

    result = result.sort_values(
        by=["score", "symbol"], ascending=[False, True], kind="mergesort"
    ).reset_index(drop=True)
    result["rank"] = np.arange(1, len(result) + 1, dtype=int)
    return result[SCORE_COLUMNS]


def select_top(scores: pd.DataFrame, n: int) -> list[str]:
    """Return the top ``n`` symbols ordered by rank ascending (1 = best)."""
    if n < 1:
        raise ValueError("n must be at least 1.")
    if scores.empty:
        return []
    ordered = scores.sort_values("rank", ascending=True)
    return ordered["symbol"].head(n).tolist()
