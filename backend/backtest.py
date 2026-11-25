"""
Pure pandas/numpy monthly-rebalanced momentum backtesting engine.

This module has NO Flask or database imports so it can be run identically in
offline tests, CLI scripts, and API routes. Reuses ``compute_scores`` and
``select_top`` from ``signals.py`` for every rebalance decision.
"""

from datetime import date, datetime
import math
import numpy as np
import pandas as pd

from signals import ALLOWED_METHODS, TRADING_DAYS_PER_YEAR, compute_scores, select_top

DEFAULT_PARAMS = {
    "top_n": 20,
    "lookback_days": 252,
    "skip_days": 21,
    "method": "vol_adjusted",
    "rebalance": "monthly",
    "cost_bps": 20.0,
    "initial_capital": 1_000_000.0,
    "risk_free_rate": 0.065,
    "start": None,
    "end": None,
}


def _safe_float(value: float | np.floating) -> float | None:
    """Return finite Python float or None."""
    num = float(value)
    return num if math.isfinite(num) else None


def _safe_div(numerator: float, denominator: float) -> float | None:
    """Divide safely, returning None if denominator is zero or non-finite."""
    if not math.isfinite(numerator) or not math.isfinite(denominator) or denominator == 0.0:
        return None
    val = numerator / denominator
    return float(val) if math.isfinite(val) else None


def _normalize_params(raw_params: dict | None) -> dict:
    """Merge user params with defaults and validate values."""
    raw = raw_params or {}
    lookback = int(raw.get("lookback_days", raw.get("lookback", DEFAULT_PARAMS["lookback_days"])))
    skip = int(raw.get("skip_days", raw.get("skip", DEFAULT_PARAMS["skip_days"])))
    top_n = int(raw.get("top_n", DEFAULT_PARAMS["top_n"]))
    method = str(raw.get("method", DEFAULT_PARAMS["method"]))
    rebalance = str(raw.get("rebalance", DEFAULT_PARAMS["rebalance"]))
    cost_bps = float(raw.get("cost_bps", DEFAULT_PARAMS["cost_bps"]))
    initial_capital = float(raw.get("initial_capital", DEFAULT_PARAMS["initial_capital"]))
    risk_free_rate = float(raw.get("risk_free_rate", DEFAULT_PARAMS["risk_free_rate"]))
    start = raw.get("start", DEFAULT_PARAMS["start"])
    end = raw.get("end", DEFAULT_PARAMS["end"])

    if top_n < 1:
        raise ValueError("top_n must be at least 1.")
    if method not in ALLOWED_METHODS:
        raise ValueError(f"method must be one of {ALLOWED_METHODS}.")
    if rebalance != "monthly":
        raise ValueError("Only 'monthly' rebalance frequency is supported.")
    if cost_bps < 0:
        raise ValueError("cost_bps must be non-negative.")
    if initial_capital <= 0:
        raise ValueError("initial_capital must be positive.")
    if lookback <= 0 or skip < 0 or skip >= lookback:
        raise ValueError("Require lookback_days > skip_days >= 0.")

    return {
        "top_n": top_n,
        "lookback_days": lookback,
        "skip_days": skip,
        "method": method,
        "rebalance": rebalance,
        "cost_bps": cost_bps,
        "initial_capital": initial_capital,
        "risk_free_rate": risk_free_rate,
        "start": pd.Timestamp(start).date().isoformat() if start else None,
        "end": pd.Timestamp(end).date().isoformat() if end else None,
    }


def _prepare_price_frame(prices: pd.DataFrame, end_ts: pd.Timestamp | None) -> pd.DataFrame:
    """Return a date-sorted DatetimeIndex DataFrame truncated at ``end_ts``."""
    frame = prices.copy()
    if not isinstance(frame.index, pd.DatetimeIndex):
        frame.index = pd.to_datetime(frame.index)
    frame.index = frame.index.normalize()
    if not frame.index.is_monotonic_increasing:
        frame = frame.sort_index()
    if end_ts is not None:
        frame = frame.loc[frame.index <= end_ts]
    return frame.astype(float)


def _prepare_benchmark_series(benchmark: pd.Series, end_ts: pd.Timestamp | None) -> pd.Series:
    """Return a clean, date-sorted benchmark Series truncated at ``end_ts``."""
    series = benchmark.dropna().astype(float).copy()
    if not isinstance(series.index, pd.DatetimeIndex):
        series.index = pd.to_datetime(series.index)
    series.index = series.index.normalize()
    if not series.index.is_monotonic_increasing:
        series = series.sort_index()
    if end_ts is not None:
        series = series.loc[series.index <= end_ts]
    return series[series > 0.0]


def _align_benchmark(
    benchmark: pd.Series,
    equity_dates: pd.DatetimeIndex,
    initial_capital: float,
    data_warnings: list[dict],
) -> pd.Series:
    """
    Align benchmark onto ``equity_dates`` without look-ahead and rebase to ``initial_capital``.

    Missing benchmark trading days (e.g., holiday mismatch or trailing day)
    carry forward the latest prior benchmark price and append a data warning.
    """
    if benchmark.empty or benchmark.index[0] > equity_dates[0]:
        raise ValueError("Benchmark series has no data on or before backtest start date.")

    combined_idx = benchmark.index.union(equity_dates).sort_values()
    ffilled = benchmark.reindex(combined_idx).ffill()
    aligned = ffilled.reindex(equity_dates)

    missing_dates = equity_dates.difference(benchmark.index)
    for missing_d in missing_dates:
        data_warnings.append(
            {
                "date": missing_d.date().isoformat(),
                "symbol": str(benchmark.name or "BENCHMARK"),
                "message": "Benchmark price missing on trading date; carried forward last close.",
            }
        )

    return initial_capital * (aligned / aligned.iloc[0])


def _compute_series_metrics(
    series: pd.Series,
    base_capital: float,
    risk_free_rate: float,
) -> dict:
    """Compute return, risk, drawdown, and monthly stats for a daily value series."""
    end_val = float(series.iloc[-1])
    total_return = (end_val / base_capital) - 1.0

    calendar_days = (series.index[-1] - series.index[0]).days
    years = calendar_days / 365.25 if calendar_days > 0 else 0.0
    if years > 0.0 and base_capital > 0.0 and end_val > 0.0:
        cagr = (end_val / base_capital) ** (1.0 / years) - 1.0
    else:
        cagr = None

    daily_ret = series.pct_change().dropna()
    rf_daily = risk_free_rate / TRADING_DAYS_PER_YEAR

    if len(daily_ret) >= 2:
        vol = float(daily_ret.std(ddof=1) * np.sqrt(TRADING_DAYS_PER_YEAR))
        excess_mean = float((daily_ret - rf_daily).mean())
        sharpe = _safe_div(excess_mean * TRADING_DAYS_PER_YEAR, vol)

        downside = np.minimum(0.0, daily_ret.to_numpy(dtype=float) - rf_daily)
        downside_dev = float(np.sqrt(np.mean(downside ** 2)) * np.sqrt(TRADING_DAYS_PER_YEAR))
        sortino = _safe_div(excess_mean * TRADING_DAYS_PER_YEAR, downside_dev)
    else:
        vol = None
        sharpe = None
        sortino = None

    running_max = series.cummax()
    drawdown = (series / running_max) - 1.0
    max_dd = float(drawdown.min())
    trough_date = drawdown.idxmin()
    peak_date = series.loc[:trough_date].idxmax()
    peak_val = float(series.loc[peak_date])

    post_trough = series.loc[series.index > trough_date]
    recovered = post_trough.loc[post_trough >= peak_val]
    recovery_date = recovered.index[0].date().isoformat() if not recovered.empty else None

    calmar = _safe_div(cagr, abs(max_dd)) if cagr is not None and max_dd < 0.0 else None

    month_ends = series.groupby(series.index.to_period("M")).last()
    prev_month_vals = month_ends.shift(1)
    prev_month_vals.iloc[0] = base_capital
    monthly_returns = (month_ends / prev_month_vals) - 1.0

    best_month = float(monthly_returns.max()) if not monthly_returns.empty else None
    worst_month = float(monthly_returns.min()) if not monthly_returns.empty else None
    pos_months_pct = (
        float((monthly_returns > 0.0).mean() * 100.0)
        if not monthly_returns.empty
        else None
    )

    return {
        "total_return": _safe_float(total_return),
        "cagr": _safe_float(cagr) if cagr is not None else None,
        "volatility": _safe_float(vol) if vol is not None else None,
        "sharpe_ratio": sharpe,
        "sortino_ratio": sortino,
        "max_drawdown": _safe_float(max_dd),
        "max_drawdown_peak_date": peak_date.date().isoformat(),
        "max_drawdown_trough_date": trough_date.date().isoformat(),
        "max_drawdown_recovery_date": recovery_date,
        "calmar_ratio": calmar,
        "best_month": _safe_float(best_month) if best_month is not None else None,
        "worst_month": _safe_float(worst_month) if worst_month is not None else None,
        "positive_months_pct": _safe_float(pos_months_pct) if pos_months_pct is not None else None,
    }


def _compute_yearly_returns(
    port_series: pd.Series,
    bench_series: pd.Series,
    initial_capital: float,
) -> list[dict]:
    """Compute calendar-year returns for strategy vs benchmark."""
    port_year_ends = port_series.groupby(port_series.index.year).last()
    bench_year_ends = bench_series.groupby(bench_series.index.year).last()

    prev_port = initial_capital
    prev_bench = initial_capital
    rows = []

    for yr in port_year_ends.index:
        p_end = float(port_year_ends.loc[yr])
        b_end = float(bench_year_ends.loc[yr])
        p_ret = (p_end / prev_port) - 1.0
        b_ret = (b_end / prev_bench) - 1.0
        rows.append(
            {
                "year": int(yr),
                "strategy_return": float(p_ret),
                "benchmark_return": float(b_ret),
                "excess_return": float(p_ret - b_ret),
            }
        )
        prev_port = p_end
        prev_bench = b_end

    return rows


def run_backtest(
    prices: pd.DataFrame,
    benchmark: pd.Series,
    params: dict | None = None,
) -> dict:
    """
    Simulate a monthly-rebalanced momentum strategy with strict no-look-ahead.

    Timing & Execution Rules
    ------------------------
    1. **Rebalance signal dates**: The last trading day of each calendar month.
       Signal scores are computed by calling ``signals.compute_scores`` with
       ``as_of = rebalance_date`` on a price slice containing ONLY rows
       ``<= rebalance_date``.
    2. **Next-day close execution lag**: Trades for a rebalance signal generated
       at the close of month-end date ``T`` execute at the close of the **next
       trading day** ``T + 1`` (never the same day).
    3. **Warmup / start date**: The first rebalance occurs only at the first
       month-end where sufficient history exists for ``compute_scores`` to
       produce at least one eligible stock (and benchmark data exists by ``T + 1``).
       The actual backtest start date is therefore the first execution date.
    4. **Portfolio drift & transaction costs**: Between rebalances, share
       counts remain fixed and holdings drift with market prices. On each
       execution day, target equal-weight values (``V_pre / k``) are compared
       against current holdings; ``cost_bps`` (default 20 bps = 0.20%) is
       charged on total traded value ``sum(|target - current|)`` and deducted
       from portfolio value before setting post-cost equal-weight share counts.
    5. **Missing prices & fewer eligible stocks**: If a held or target stock
       has no valid price on a day, its last known valid price is carried
       forward and recorded in ``data_warnings``. If fewer than ``top_n`` stocks
       are eligible, all eligible stocks are held in equal weight and flagged.
    """
    cfg = _normalize_params(params)
    start_ts = pd.Timestamp(cfg["start"]).normalize() if cfg["start"] else None
    end_ts = pd.Timestamp(cfg["end"]).normalize() if cfg["end"] else None

    if start_ts is not None and end_ts is not None and start_ts >= end_ts:
        raise ValueError("'start' date must be strictly before 'end' date.")

    price_df = _prepare_price_frame(prices, end_ts)
    if price_df.empty or len(price_df) < 2:
        raise ValueError("Insufficient price history to run backtest.")

    bench_series = _prepare_benchmark_series(benchmark, end_ts)
    if bench_series.empty:
        raise ValueError("Benchmark series contains no data in the requested range.")

    dates = price_df.index
    symbols = price_df.columns
    month_end_dates = dates.to_series().groupby(dates.to_period("M")).last().tolist()
    date_to_pos = {d: i for i, d in enumerate(dates)}

    # Build the rebalance schedule using ONLY data <= signal_date.
    first_bench_date = bench_series.index[0]
    rebalance_plan: dict[int, dict] = {}
    started = False

    for sig_date in month_end_dates:
        sig_pos = date_to_pos[sig_date]
        exec_pos = sig_pos + 1
        if exec_pos >= len(dates):
            continue
        exec_date = dates[exec_pos]

        if start_ts is not None and exec_date < start_ts:
            continue
        if exec_date < first_bench_date:
            continue

        # Slice strictly <= sig_date to guarantee zero look-ahead.
        scores = compute_scores(
            price_df.iloc[: sig_pos + 1],
            as_of=sig_date,
            method=cfg["method"],
            lookback_days=cfg["lookback_days"],
            skip_days=cfg["skip_days"],
        )
        selected = select_top(scores, cfg["top_n"])
        if not started and not selected:
            continue

        started = True
        rebalance_plan[exec_pos] = {
            "signal_date": sig_date,
            "executed_date": exec_date,
            "selected": selected,
        }

    if not rebalance_plan:
        raise ValueError(
            "No eligible rebalance dates found (insufficient price history or date window too narrow)."
        )

    first_exec_pos = min(rebalance_plan.keys())
    cost_rate = cfg["cost_bps"] / 10_000.0
    initial_capital = cfg["initial_capital"]

    last_known = pd.Series(np.nan, index=symbols, dtype=float)
    shares = pd.Series(0.0, index=symbols, dtype=float)
    cash = float(initial_capital)

    data_warnings: list[dict] = []
    rebalances: list[dict] = []
    portfolio_values: list[float] = []
    equity_dates: list[pd.Timestamp] = []

    price_values = price_df.to_numpy(dtype=float)

    for t in range(len(dates)):
        row_prices = pd.Series(price_values[t], index=symbols, dtype=float)
        valid_today = row_prices.notna() & (row_prices > 0.0)
        last_known.loc[valid_today] = row_prices.loc[valid_today]

        if t < first_exec_pos:
            continue

        current_date = dates[t]
        date_str = current_date.date().isoformat()
        held_mask = shares > 0.0

        # Flag held stocks missing a price today and carry forward last known price.
        if held_mask.any():
            missing_held = held_mask & (~valid_today)
            for sym in symbols[missing_held]:
                data_warnings.append(
                    {
                        "date": date_str,
                        "symbol": str(sym),
                        "message": "Missing price for held stock; carried forward last known price.",
                    }
                )

        eval_prices = row_prices.where(valid_today, last_known)
        holdings_val = float((shares[held_mask] * eval_prices[held_mask]).sum()) if held_mask.any() else 0.0
        v_pre = cash + holdings_val

        if t in rebalance_plan:
            plan = rebalance_plan[t]
            selected = [s for s in plan["selected"] if pd.notna(eval_prices.get(s)) and eval_prices.get(s) > 0.0]

            if len(selected) < len(plan["selected"]):
                dropped = set(plan["selected"]) - set(selected)
                for sym in sorted(dropped):
                    data_warnings.append(
                        {
                            "date": date_str,
                            "symbol": str(sym),
                            "message": "Selected stock had no valid price on execution date and was skipped.",
                        }
                    )

            if len(selected) < cfg["top_n"]:
                data_warnings.append(
                    {
                        "date": date_str,
                        "symbol": None,
                        "message": f"Only {len(selected)} eligible stocks available (target top_n={cfg['top_n']}).",
                    }
                )

            target_weights = pd.Series(0.0, index=symbols, dtype=float)
            if selected:
                target_weights.loc[selected] = 1.0 / len(selected)

            current_values = pd.Series(0.0, index=symbols, dtype=float)
            if held_mask.any():
                current_values.loc[held_mask] = shares.loc[held_mask] * eval_prices.loc[held_mask]

            # Warn if a newly selected stock has a carried price on execution day.
            for sym in selected:
                if not bool(valid_today.loc[sym]) and not bool(held_mask.loc[sym]):
                    data_warnings.append(
                        {
                            "date": date_str,
                            "symbol": str(sym),
                            "message": "Missing price on execution date for selected stock; used carried price.",
                        }
                    )

            target_values = target_weights * v_pre
            traded_value = float((target_values - current_values).abs().sum())
            cost_paid = traded_value * cost_rate
            v_post = v_pre - cost_paid

            new_shares = pd.Series(0.0, index=symbols, dtype=float)
            if selected and v_post > 0.0:
                new_shares.loc[selected] = (target_weights.loc[selected] * v_post) / eval_prices.loc[selected]
                cash = 0.0
            else:
                cash = v_post

            shares = new_shares
            turnover = (0.5 * traded_value / v_pre) if v_pre > 0.0 else 0.0

            rebalances.append(
                {
                    "signal_date": plan["signal_date"].date().isoformat(),
                    "executed_date": plan["executed_date"].date().isoformat(),
                    "selected_symbols": selected,
                    "selected_count": len(selected),
                    "target_count": cfg["top_n"],
                    "turnover": float(turnover),
                    "traded_value": float(traded_value),
                    "cost_paid": float(cost_paid),
                    "weights": {sym: float(target_weights.loc[sym]) for sym in selected},
                }
            )
            day_value = v_post
        else:
            day_value = v_pre

        equity_dates.append(current_date)
        portfolio_values.append(float(day_value))

    eq_index = pd.DatetimeIndex(equity_dates, name="date")
    port_series = pd.Series(portfolio_values, index=eq_index, dtype=float)
    bench_rebased = _align_benchmark(bench_series, eq_index, initial_capital, data_warnings)

    running_max = port_series.cummax()
    dd_series = (port_series / running_max) - 1.0

    equity_curve = [
        {
            "date": d.date().isoformat(),
            "portfolio_value": float(pv),
            "benchmark_value": float(bv),
            "drawdown": float(dd),
        }
        for d, pv, bv, dd in zip(eq_index, port_series, bench_rebased, dd_series)
    ]

    strat_metrics = _compute_series_metrics(
        port_series, base_capital=initial_capital, risk_free_rate=cfg["risk_free_rate"]
    )
    bench_metrics = _compute_series_metrics(
        bench_rebased, base_capital=initial_capital, risk_free_rate=cfg["risk_free_rate"]
    )

    calendar_days = (eq_index[-1] - eq_index[0]).days
    years = calendar_days / 365.25 if calendar_days > 0 else 0.0
    total_turnover = sum(r["turnover"] for r in rebalances)
    total_cost_paid = sum(r["cost_paid"] for r in rebalances)

    strat_metrics["avg_annual_turnover"] = _safe_div(total_turnover, years) if years > 0.0 else None
    strat_metrics["total_cost_paid"] = float(total_cost_paid)
    strat_metrics["total_cost_pct"] = float((total_cost_paid / initial_capital) * 100.0)
    strat_metrics["avg_holdings"] = (
        float(np.mean([r["selected_count"] for r in rebalances])) if rebalances else 0.0
    )

    yearly_returns = _compute_yearly_returns(port_series, bench_rebased, initial_capital)

    return {
        "params": cfg,
        "start_date": eq_index[0].date().isoformat(),
        "end_date": eq_index[-1].date().isoformat(),
        "equity_curve": equity_curve,
        "rebalances": rebalances,
        "yearly_returns": yearly_returns,
        "metrics": {
            "risk_free_rate": cfg["risk_free_rate"],
            "strategy": strat_metrics,
            "benchmark": bench_metrics,
        },
        "data_warnings": data_warnings,
    }
