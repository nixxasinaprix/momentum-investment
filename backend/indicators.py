"""
Pure pandas/numpy technical indicators and trend classification.

No Flask or database imports so functions can be tested offline and reused.
"""

import numpy as np
import pandas as pd

from signals import TRADING_DAYS_PER_YEAR, compute_momentum, compute_volatility

TREND_STRONG_UPTREND = "Strong uptrend"
TREND_PULLBACK = "Pullback"
TREND_WEAKENING = "Weakening"
TREND_DOWNTREND = "Downtrend"
TREND_INSUFFICIENT = "Insufficient data"


def compute_sma(data: pd.Series | pd.DataFrame, window: int) -> pd.Series | pd.DataFrame:
    """Compute simple moving average over ``window`` trading days."""
    if window < 1:
        raise ValueError("window must be at least 1.")
    return data.rolling(window=window, min_periods=window).mean()


def compute_smas(
    series: pd.Series, windows: tuple[int, ...] = (20, 50, 200)
) -> pd.DataFrame:
    """Return a DataFrame containing SMA columns (e.g. sma_20, sma_50, sma_200)."""
    return pd.DataFrame(
        {f"sma_{w}": compute_sma(series, w) for w in windows},
        index=series.index,
    )


def compute_rsi(
    data: pd.Series | pd.DataFrame, period: int = 14
) -> pd.Series | pd.DataFrame:
    """
    Compute Wilder's Relative Strength Index (RSI) over ``period`` trading days.

    Uses exponential smoothing with ``alpha = 1 / period`` on positive and
    negative daily price changes.
    """
    if period < 2:
        raise ValueError("period must be at least 2.")

    delta = data.diff()
    gains = delta.clip(lower=0.0)
    losses = (-delta).clip(lower=0.0)

    avg_gain = gains.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    avg_loss = losses.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()

    rs = avg_gain / avg_loss.replace(0.0, np.nan)
    rsi = 100.0 - (100.0 / (1.0 + rs))

    # Handle zero-loss (all gains -> 100) and flat (both 0 -> 50) cases cleanly.
    if isinstance(data, pd.Series):
        both_zero = (avg_gain == 0.0) & (avg_loss == 0.0)
        only_gain = (avg_loss == 0.0) & (avg_gain > 0.0)
        rsi = rsi.where(~only_gain, 100.0).where(~both_zero, 50.0)
    else:
        both_zero = (avg_gain == 0.0) & (avg_loss == 0.0)
        only_gain = (avg_loss == 0.0) & (avg_gain > 0.0)
        rsi = rsi.mask(only_gain, 100.0).mask(both_zero, 50.0)
    return rsi


def compute_52w_high_low(
    prices: pd.DataFrame | pd.Series, window: int = 252
) -> dict[str, pd.Series | float]:
    """
    Compute trailing 52-week high, 52-week low, and % below 52-week high.

    ``pct_below_high`` is returned as a non-negative percentage (e.g. ``12.5``
    means the latest price is 12.5% below its trailing 252-day high).
    """
    tail = prices.iloc[-window:]
    high = tail.max(axis=0)
    low = tail.min(axis=0)
    latest = prices.iloc[-1]
    if isinstance(prices, pd.Series):
        pct_below = ((1.0 - (latest / high)) * 100.0) if (pd.notna(high) and high > 0.0 and pd.notna(latest)) else np.nan
    else:
        pct_below = ((1.0 - (latest / high)) * 100.0).where(high > 0.0)
    return {
        "high_52w": high,
        "low_52w": low,
        "pct_below_52w_high": pct_below,
    }


def compute_trailing_return(prices: pd.DataFrame, trading_days: int) -> pd.Series:
    """Compute trailing simple return over ``trading_days`` positions."""
    if len(prices) <= trading_days:
        return pd.Series(np.nan, index=prices.columns, dtype=float)
    latest = prices.iloc[-1].astype(float)
    past = prices.iloc[-1 - trading_days].astype(float)
    valid = latest.notna() & past.notna() & (latest > 0.0) & (past > 0.0)
    ret = pd.Series(np.nan, index=prices.columns, dtype=float)
    ret.loc[valid] = (latest.loc[valid] / past.loc[valid]) - 1.0
    return ret


def compute_period_returns(
    prices: pd.DataFrame, as_of: pd.Timestamp | str | None = None
) -> pd.DataFrame:
    """
    Compute 1M (21d), 3M (63d), 6M (126d), and 12-1M momentum returns per symbol.
    """
    target_as_of = prices.index[-1] if as_of is None else pd.Timestamp(as_of).normalize()
    sliced = prices.loc[prices.index <= target_as_of]
    return pd.DataFrame(
        {
            "ret_1m": compute_trailing_return(sliced, 21),
            "ret_3m": compute_trailing_return(sliced, 63),
            "ret_6m": compute_trailing_return(sliced, 126),
            "ret_12_1m": compute_momentum(sliced, target_as_of, lookback_days=252, skip_days=21),
            "volatility": compute_volatility(sliced, target_as_of, window=TRADING_DAYS_PER_YEAR),
        },
        index=prices.columns,
    )


def compute_relative_strength(
    stock_prices: pd.Series, benchmark_prices: pd.Series
) -> pd.Series:
    """
    Compute relative strength ratio ``(stock / benchmark)`` rebased to 100.

    Returns a Series indexed like ``stock_prices`` where > 100 indicates
    outperformance versus the benchmark since the start of the window.
    """
    if stock_prices.empty or benchmark_prices.empty:
        return pd.Series(np.nan, index=stock_prices.index, dtype=float)

    combined = benchmark_prices.reindex(
        benchmark_prices.index.union(stock_prices.index)
    ).ffill()
    bench_aligned = combined.reindex(stock_prices.index)

    ratio = stock_prices.astype(float) / bench_aligned.astype(float)
    valid = ratio.dropna()
    if valid.empty or valid.iloc[0] == 0.0:
        return pd.Series(np.nan, index=stock_prices.index, dtype=float)
    return (ratio / valid.iloc[0]) * 100.0


def classify_trend(
    price: float | None, sma50: float | None, sma200: float | None
) -> str:
    """
    Classify stock trend regime from price, 50DMA, and 200DMA.

    Rules:
    - "Strong uptrend": price > 50DMA > 200DMA
    - "Pullback": price < 50DMA and price > 200DMA (or reclaiming above 200DMA)
    - "Weakening": price < 200DMA and 50DMA > 200DMA
    - "Downtrend": price < 50DMA < 200DMA (or price < 200DMA and 50DMA <= 200DMA)
    """
    if (
        price is None
        or sma50 is None
        or sma200 is None
        or pd.isna(price)
        or pd.isna(sma50)
        or pd.isna(sma200)
    ):
        return TREND_INSUFFICIENT

    if price > sma50 and sma50 > sma200:
        return TREND_STRONG_UPTREND
    if price < sma50 and price > sma200:
        return TREND_PULLBACK
    if price < sma200 and sma50 > sma200:
        return TREND_WEAKENING
    if price < sma50 and sma50 < sma200:
        return TREND_DOWNTREND
    # Edge boundaries (e.g., exact equality or price > 200DMA before 50DMA cross)
    if price >= sma200:
        return TREND_PULLBACK
    return TREND_DOWNTREND


def classify_trend_series(
    price: pd.Series, sma50: pd.Series, sma200: pd.Series
) -> pd.Series:
    """Vectorized trend classification across a Series of stocks."""
    missing = price.isna() | sma50.isna() | sma200.isna()
    conditions = [
        missing,
        (price > sma50) & (sma50 > sma200),
        (price < sma50) & (price > sma200),
        (price < sma200) & (sma50 > sma200),
        (price < sma50) & (sma50 < sma200),
        price >= sma200,
    ]
    choices = [
        TREND_INSUFFICIENT,
        TREND_STRONG_UPTREND,
        TREND_PULLBACK,
        TREND_WEAKENING,
        TREND_DOWNTREND,
        TREND_PULLBACK,
    ]
    return pd.Series(
        np.select(conditions, choices, default=TREND_DOWNTREND),
        index=price.index,
        dtype=object,
    )


def describe_trend(trend: str) -> str:
    """Return a plain-English explanation for a trend regime label."""
    descriptions = {
        TREND_STRONG_UPTREND: (
            "Price is trading above its 50-day moving average, which sits above "
            "its 200-day moving average — confirming sustained upward momentum across both short and long horizons."
        ),
        TREND_PULLBACK: (
            "Price has dipped below the 50-day moving average while remaining above "
            "the 200-day moving average — indicating a short-term consolidation within an intact longer-term uptrend."
        ),
        TREND_WEAKENING: (
            "Price has fallen below the 200-day moving average even though the 50-day "
            "moving average has not yet crossed below it — signaling trend deterioration."
        ),
        TREND_DOWNTREND: (
            "Price is trading below its 50-day moving average, which is below its "
            "200-day moving average — confirming broad downward pressure."
        ),
        TREND_INSUFFICIENT: (
            "Not enough historical trading days (minimum 200) to evaluate long-term moving averages."
        ),
    }
    return descriptions.get(trend, "")
