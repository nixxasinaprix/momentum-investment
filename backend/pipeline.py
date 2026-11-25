"""
Pure pandas/numpy Nifty 500 stock-picking pipeline.

Stages executed in strict order with zero look-ahead:
    universe -> quality filters -> momentum score -> rank -> portfolio -> buy/sell/hold diff
"""

from datetime import date, datetime
import math
import numpy as np
import pandas as pd

from indicators import (
    classify_trend_series,
    compute_52w_high_low,
    compute_sma,
    compute_trailing_return,
)
from signals import (
    TRADING_DAYS_PER_YEAR,
    compute_momentum,
    compute_scores,
    compute_volatility,
)

PIPELINE_METHODS = ("vol_adjusted", "raw", "zscore_blend")
UNKNOWN_MCAP_POLICIES = ("exclude", "include")
CRORE = 1e7

DEFAULT_PIPELINE_PARAMS = {
    "as_of": None,
    "min_market_cap_cr": 5000.0,
    "unknown_mcap_policy": "exclude",
    "min_price": 50.0,
    "min_avg_traded_value_cr": 5.0,
    "min_history_days": 273,
    "above_200dma": True,
    "max_pct_below_52w_high": 25.0,
    "excluded_sectors": [],
    "method": "vol_adjusted",
    "lookback_days": 252,
    "skip_days": 21,
    "top_n": 20,
}


def _clean_float(val) -> float | None:
    if val is None or pd.isna(val):
        return None
    num = float(val)
    return num if math.isfinite(num) else None


def normalize_pipeline_params(raw: dict | None) -> dict:
    """Merge parameters with defaults and validate bounds."""
    src = raw or {}
    lookback = int(src.get("lookback_days", src.get("lookback", DEFAULT_PIPELINE_PARAMS["lookback_days"])))
    skip = int(src.get("skip_days", src.get("skip", DEFAULT_PIPELINE_PARAMS["skip_days"])))
    top_n = int(src.get("top_n", src.get("top", DEFAULT_PIPELINE_PARAMS["top_n"])))
    method = str(src.get("method", DEFAULT_PIPELINE_PARAMS["method"])).strip()
    unknown_policy = str(
        src.get("unknown_mcap_policy", DEFAULT_PIPELINE_PARAMS["unknown_mcap_policy"])
    ).strip()

    min_mcap = float(src.get("min_market_cap_cr", DEFAULT_PIPELINE_PARAMS["min_market_cap_cr"]))
    min_price = float(src.get("min_price", DEFAULT_PIPELINE_PARAMS["min_price"]))
    min_atv = float(
        src.get("min_avg_traded_value_cr", DEFAULT_PIPELINE_PARAMS["min_avg_traded_value_cr"])
    )
    min_hist = int(src.get("min_history_days", DEFAULT_PIPELINE_PARAMS["min_history_days"]))
    above_200dma = bool(src.get("above_200dma", DEFAULT_PIPELINE_PARAMS["above_200dma"]))

    raw_max_dd_high = src.get(
        "max_pct_below_52w_high", DEFAULT_PIPELINE_PARAMS["max_pct_below_52w_high"]
    )
    max_pct_below_52w = (
        float(raw_max_dd_high)
        if raw_max_dd_high is not None and raw_max_dd_high != ""
        else None
    )

    raw_excl = src.get("excluded_sectors", DEFAULT_PIPELINE_PARAMS["excluded_sectors"])
    if isinstance(raw_excl, str):
        excluded_sectors = [s.strip() for s in raw_excl.split(",") if s.strip()]
    elif isinstance(raw_excl, (list, tuple, set)):
        excluded_sectors = sorted({str(s).strip() for s in raw_excl if str(s).strip()})
    else:
        excluded_sectors = []

    raw_as_of = src.get("as_of", DEFAULT_PIPELINE_PARAMS["as_of"])
    as_of = (
        pd.Timestamp(raw_as_of).date().isoformat()
        if raw_as_of not in (None, "")
        else None
    )

    if method not in PIPELINE_METHODS:
        raise ValueError(f"method must be one of {PIPELINE_METHODS}.")
    if unknown_policy not in UNKNOWN_MCAP_POLICIES:
        raise ValueError(f"unknown_mcap_policy must be one of {UNKNOWN_MCAP_POLICIES}.")
    if top_n < 1 or top_n > 100:
        raise ValueError("top_n must be between 1 and 100.")
    if lookback < 60 or lookback > 504:
        raise ValueError("lookback_days must be between 60 and 504.")
    if skip < 0 or skip > 63:
        raise ValueError("skip_days must be between 0 and 63.")
    if skip >= lookback:
        raise ValueError("skip_days must be strictly less than lookback_days.")
    if min_mcap < 0 or min_price < 0 or min_atv < 0 or min_hist < 0:
        raise ValueError("Filter thresholds must be non-negative.")
    if max_pct_below_52w is not None and (max_pct_below_52w < 0 or max_pct_below_52w > 100):
        raise ValueError("max_pct_below_52w_high must be between 0 and 100.")

    return {
        "as_of": as_of,
        "min_market_cap_cr": min_mcap,
        "unknown_mcap_policy": unknown_policy,
        "min_price": min_price,
        "min_avg_traded_value_cr": min_atv,
        "min_history_days": min_hist,
        "above_200dma": above_200dma,
        "max_pct_below_52w_high": max_pct_below_52w,
        "excluded_sectors": excluded_sectors,
        "method": method,
        "lookback_days": lookback,
        "skip_days": skip,
        "top_n": top_n,
    }


def _prepare_matrix(df: pd.DataFrame | None) -> pd.DataFrame:
    if df is None or df.empty:
        return pd.DataFrame(index=pd.DatetimeIndex([], name="date"))
    out = df.copy()
    if not isinstance(out.index, pd.DatetimeIndex):
        out.index = pd.to_datetime(out.index)
    out.index = out.index.normalize()
    if not out.index.is_monotonic_increasing:
        out = out.sort_index()
    return out.astype(float)


def _compute_zscore_blend_scores(
    prices_filtered: pd.DataFrame,
    as_of: pd.Timestamp,
    lookback_days: int,
    skip_days: int,
) -> pd.DataFrame:
    """Score filtered stocks by 50/50 cross-sectional z-score of 6M and 12M momentum."""
    if prices_filtered.empty:
        return pd.DataFrame(columns=["symbol", "momentum", "volatility", "score", "rank"])

    mom_12 = compute_momentum(
        prices_filtered, as_of, lookback_days=lookback_days, skip_days=skip_days
    )
    lookback_6m = min(126, lookback_days)
    skip_6m = min(skip_days, lookback_6m - 1)
    mom_6 = compute_momentum(
        prices_filtered, as_of, lookback_days=lookback_6m, skip_days=skip_6m
    )
    vol = compute_volatility(prices_filtered, as_of, window=lookback_days)

    df = pd.DataFrame(
        {
            "symbol": prices_filtered.columns.astype(str),
            "mom_6": mom_6.to_numpy(dtype=float),
            "momentum": mom_12.to_numpy(dtype=float),
            "volatility": vol.to_numpy(dtype=float),
        }
    )
    df = df.loc[np.isfinite(df["momentum"]) & np.isfinite(df["mom_6"])].copy()
    if df.empty:
        return pd.DataFrame(columns=["symbol", "momentum", "volatility", "score", "rank"])

    def _z(s: pd.Series) -> pd.Series:
        std = float(s.std(ddof=0))
        if not math.isfinite(std) or std == 0.0:
            return pd.Series(0.0, index=s.index)
        return (s - float(s.mean())) / std

    df["score"] = 0.5 * _z(df["mom_6"]) + 0.5 * _z(df["momentum"])
    df = df.sort_values(
        by=["score", "symbol"], ascending=[False, True], kind="mergesort"
    ).reset_index(drop=True)
    df["rank"] = np.arange(1, len(df) + 1, dtype=int)
    return df[["symbol", "momentum", "volatility", "score", "rank"]]


def _evaluate_cross_section(
    prices: pd.DataFrame,
    volumes: pd.DataFrame,
    meta_by_symbol: dict[str, dict],
    universe_symbols: list[str],
    as_of_ts: pd.Timestamp,
    cfg: dict,
    include_sparklines: bool = True,
) -> dict:
    """Run stages (a) filters, (b) score, and (c) rank strictly on data <= as_of_ts."""
    p_slice = prices.loc[prices.index <= as_of_ts]
    if p_slice.empty:
        return {
            "as_of": None,
            "universe_count": len(universe_symbols),
            "filtered_count": 0,
            "scored_count": 0,
            "selected": [],
            "excluded": [],
        }

    effective_ts = p_slice.index[-1]
    v_slice = volumes.loc[volumes.index <= effective_ts] if not volumes.empty else pd.DataFrame(index=p_slice.index)

    # Align columns to universe_symbols cleanly
    p_univ = p_slice.reindex(columns=universe_symbols)
    v_univ = v_slice.reindex(index=p_univ.index, columns=universe_symbols)

    filled_p = p_univ.ffill()
    last_price = filled_p.iloc[-1]
    sma50 = compute_sma(filled_p, 50).iloc[-1]
    sma200 = compute_sma(filled_p, 200).iloc[-1]
    hl = compute_52w_high_low(filled_p, window=252)
    trends = classify_trend_series(last_price, sma50, sma200)

    # 20-day average traded value (price * volume) up to effective_ts
    traded_val = p_univ * v_univ
    avg_tv_20 = traded_val.iloc[-20:].mean(axis=0, skipna=True)

    ret_6m = compute_trailing_return(filled_p, 126)
    ret_12_1m = compute_momentum(
        p_univ, effective_ts, lookback_days=cfg["lookback_days"], skip_days=cfg["skip_days"]
    )
    vol_ann = compute_volatility(p_univ, effective_ts, window=cfg["lookback_days"])

    history_before = (
        p_univ.iloc[:-1].notna().sum(axis=0)
        if len(p_univ) > 1
        else pd.Series(0, index=universe_symbols)
    )
    required_history = max(cfg["min_history_days"], cfg["lookback_days"] + cfg["skip_days"])
    excluded_sector_set = set(cfg["excluded_sectors"])

    spark_tail = filled_p.iloc[-30:] if include_sparklines else None

    # Stage A: Quality filters per stock
    passed_filter_syms: list[str] = []
    records: dict[str, dict] = {}

    for sym in universe_symbols:
        meta = meta_by_symbol.get(sym, {"symbol": sym, "name": sym, "sector": "Other", "market_cap": None})
        sector = meta.get("sector") or "Other"
        raw_mcap = meta.get("market_cap")
        mcap_cr = (float(raw_mcap) / CRORE) if (raw_mcap is not None and pd.notna(raw_mcap) and float(raw_mcap) > 0) else None
        mcap_status = "known" if mcap_cr is not None else "unknown"

        px = _clean_float(last_price.get(sym))
        sma200_val = _clean_float(sma200.get(sym))
        pct_below_52w = _clean_float(hl["pct_below_52w_high"].get(sym))
        atv_raw = _clean_float(avg_tv_20.get(sym))
        atv_cr = (atv_raw / CRORE) if atv_raw is not None else None
        hist_cnt = int(history_before.get(sym, 0))

        # Evaluate each filter individually
        if cfg["min_market_cap_cr"] > 0:
            if mcap_cr is None:
                pass_mcap = cfg["unknown_mcap_policy"] == "include"
            else:
                pass_mcap = mcap_cr >= cfg["min_market_cap_cr"]
        else:
            pass_mcap = True

        pass_sector = sector not in excluded_sector_set
        pass_history = hist_cnt >= required_history
        pass_price = True if cfg["min_price"] <= 0 else (px is not None and px >= cfg["min_price"])

        if cfg["min_avg_traded_value_cr"] > 0 and not volumes.empty:
            pass_liq = atv_cr is not None and atv_cr >= cfg["min_avg_traded_value_cr"]
        else:
            pass_liq = True

        if cfg["above_200dma"]:
            pass_200dma = px is not None and sma200_val is not None and px > sma200_val
        else:
            pass_200dma = True

        if cfg["max_pct_below_52w_high"] is not None and cfg["max_pct_below_52w_high"] < 100.0:
            pass_52w = pct_below_52w is not None and pct_below_52w <= cfg["max_pct_below_52w_high"]
        else:
            pass_52w = True

        checks = {
            "market_cap": pass_mcap,
            "sector": pass_sector,
            "min_history": pass_history,
            "min_price": pass_price,
            "liquidity": pass_liq,
            "above_200dma": pass_200dma,
            "within_52w_high": pass_52w,
            "valid_score": False,
        }

        removal_reason = None
        if not pass_mcap:
            removal_reason = (
                "Unknown market cap (excluded by setting)"
                if mcap_cr is None
                else f"Market cap ₹{mcap_cr:,.0f} Cr < ₹{cfg['min_market_cap_cr']:,.0f} Cr"
            )
        elif not pass_sector:
            removal_reason = f"Excluded sector ({sector})"
        elif not pass_history:
            removal_reason = f"Insufficient history ({hist_cnt} < {required_history} days)"
        elif not pass_price:
            removal_reason = (
                "No valid price"
                if px is None
                else f"Price ₹{px:.2f} < ₹{cfg['min_price']:.0f}"
            )
        elif not pass_liq:
            removal_reason = (
                "No volume data"
                if atv_cr is None
                else f"20D avg turnover ₹{atv_cr:.2f} Cr < ₹{cfg['min_avg_traded_value_cr']:.1f} Cr"
            )
        elif not pass_200dma:
            removal_reason = (
                "Insufficient history for 200DMA"
                if sma200_val is None
                else f"Below 200DMA (₹{px:.2f} ≤ ₹{sma200_val:.2f})"
            )
        elif not pass_52w:
            removal_reason = (
                "Missing 52W high"
                if pct_below_52w is None
                else f"{pct_below_52w:.1f}% below 52W high (> {cfg['max_pct_below_52w_high']:.0f}%)"
            )

        if removal_reason is None:
            passed_filter_syms.append(sym)

        spark_vals = (
            [round(float(v), 2) for v in spark_tail[sym].dropna().tolist()]
            if spark_tail is not None
            else []
        )

        records[sym] = {
            "symbol": sym,
            "name": meta.get("name") or sym,
            "sector": sector,
            "last_price": px,
            "market_cap_cr": round(mcap_cr, 2) if mcap_cr is not None else None,
            "market_cap_status": mcap_status,
            "avg_traded_value_cr": round(atv_cr, 2) if atv_cr is not None else None,
            "history_days": hist_cnt,
            "sma_200": sma200_val,
            "pct_below_52w_high": round(pct_below_52w, 2) if pct_below_52w is not None else None,
            "ret_6m": _clean_float(ret_6m.get(sym)),
            "ret_12_1m": _clean_float(ret_12_1m.get(sym)),
            "volatility": _clean_float(vol_ann.get(sym)),
            "trend": str(trends.get(sym, "Insufficient data")),
            "sparkline": spark_vals,
            "checks": checks,
            "passed_filters": removal_reason is None,
            "removal_reason": removal_reason,
            "score": None,
            "rank": None,
            "weight": 0.0,
        }

    # Stage B: Score filtered survivors
    if passed_filter_syms:
        filtered_prices = p_univ[passed_filter_syms]
        if cfg["method"] == "zscore_blend":
            scores_df = _compute_zscore_blend_scores(
                filtered_prices,
                effective_ts,
                lookback_days=cfg["lookback_days"],
                skip_days=cfg["skip_days"],
            )
        else:
            scores_df = compute_scores(
                filtered_prices,
                as_of=effective_ts,
                method=cfg["method"],
                lookback_days=cfg["lookback_days"],
                skip_days=cfg["skip_days"],
            )
    else:
        scores_df = pd.DataFrame(columns=["symbol", "momentum", "volatility", "score", "rank"])

    scored_syms: list[str] = []
    for row in scores_df.itertuples(index=False):
        rec = records[row.symbol]
        rec["checks"]["valid_score"] = True
        rec["score"] = _clean_float(row.score)
        rec["rank"] = int(row.rank)
        if cfg["method"] != "zscore_blend":
            rec["ret_12_1m"] = _clean_float(row.momentum)
            rec["volatility"] = _clean_float(row.volatility)
        scored_syms.append(row.symbol)

    scored_set = set(scored_syms)
    for sym in passed_filter_syms:
        if sym not in scored_set:
            records[sym]["removal_reason"] = "Missing price at lookback/skip position or zero volatility"

    # Stage C: Select top N with equal weights
    selected_syms = scored_syms[: cfg["top_n"]]
    selected_set = set(selected_syms)
    weight = (1.0 / len(selected_syms)) if selected_syms else 0.0

    selected_list: list[dict] = []
    excluded_list: list[dict] = []

    for sym in selected_syms:
        rec = records[sym]
        rec["weight"] = round(weight, 6)
        mom_pct = f"{rec['ret_12_1m'] * 100:+.1f}%" if rec["ret_12_1m"] is not None else "N/A"
        vol_pct = f"{rec['volatility'] * 100:.1f}%" if rec["volatility"] is not None else "N/A"
        rec["reason_picked"] = (
            f"Ranked #{rec['rank']} ({cfg['method']}): {mom_pct} 12-1M return, "
            f"{vol_pct} vol, {rec['trend'].lower()}."
        )
        selected_list.append(rec)

    for sym in universe_symbols:
        if sym in selected_set:
            continue
        rec = records[sym]
        if rec["removal_reason"] is None and rec["rank"] is not None:
            rec["removal_reason"] = f"Ranked #{rec['rank']} (outside Top {cfg['top_n']})"
        excluded_list.append(rec)

    excluded_list.sort(
        key=lambda r: (
            r["rank"] is None,
            r["rank"] if r["rank"] is not None else 999999,
            r["symbol"],
        )
    )

    return {
        "as_of": effective_ts.date().isoformat(),
        "universe_count": len(universe_symbols),
        "filtered_count": len(passed_filter_syms),
        "scored_count": len(scored_syms),
        "selected": selected_list,
        "excluded": excluded_list,
    }


def _find_prev_month_end(index: pd.DatetimeIndex, effective_ts: pd.Timestamp) -> pd.Timestamp | None:
    """Return the previous calendar month's last trading day strictly before effective_ts."""
    if index.empty:
        return None
    eff_period = effective_ts.to_period("M")
    prev_dates = index[index.to_period("M") < eff_period]
    if prev_dates.empty:
        return None
    return pd.Timestamp(prev_dates[-1]).normalize()


def run_pipeline(
    prices: pd.DataFrame,
    volumes: pd.DataFrame | None = None,
    stock_meta: pd.DataFrame | list[dict] | None = None,
    params: dict | None = None,
) -> dict:
    """
    Execute the end-to-end stock-picking pipeline with strict no-look-ahead:
        universe -> quality filters -> momentum score -> rank -> portfolio -> buy/sell/hold.
    """
    cfg = normalize_pipeline_params(params)
    p_df = _prepare_matrix(prices)
    v_df = _prepare_matrix(volumes)

    if isinstance(stock_meta, pd.DataFrame):
        meta_list = stock_meta.to_dict(orient="records")
    elif isinstance(stock_meta, list):
        meta_list = stock_meta
    else:
        meta_list = [{"symbol": str(c), "name": str(c), "sector": "Other", "market_cap": None} for c in p_df.columns]

    meta_by_symbol = {str(m["symbol"]): m for m in meta_list}
    universe_symbols = sorted(
        set(meta_by_symbol.keys()) | set(p_df.columns.astype(str))
    )

    if p_df.empty or not universe_symbols:
        return {
            "as_of": None,
            "prev_rebalance_date": None,
            "params": cfg,
            "stages": [
                {"key": "universe", "label": "Universe", "count": len(universe_symbols)},
                {"key": "filtered", "label": "After Filters", "count": 0},
                {"key": "scored", "label": "Valid Momentum", "count": 0},
                {"key": "selected", "label": "Selected Portfolio", "count": 0},
            ],
            "selected": [],
            "changes": {"buy": [], "sell": [], "hold": []},
            "excluded": [],
        }

    target_ts = pd.Timestamp(cfg["as_of"]).normalize() if cfg["as_of"] else p_df.index[-1]
    p_up_to = p_df.loc[p_df.index <= target_ts]
    if p_up_to.empty:
        return {
            "as_of": None,
            "prev_rebalance_date": None,
            "params": cfg,
            "stages": [
                {"key": "universe", "label": "Universe", "count": len(universe_symbols)},
                {"key": "filtered", "label": "After Filters", "count": 0},
                {"key": "scored", "label": "Valid Momentum", "count": 0},
                {"key": "selected", "label": "Selected Portfolio", "count": 0},
            ],
            "selected": [],
            "changes": {"buy": [], "sell": [], "hold": []},
            "excluded": [],
        }

    effective_ts = p_up_to.index[-1]
    current = _evaluate_cross_section(
        p_up_to,
        v_df.loc[v_df.index <= effective_ts] if not v_df.empty else v_df,
        meta_by_symbol,
        universe_symbols,
        effective_ts,
        cfg,
        include_sparklines=True,
    )

    prev_ts = _find_prev_month_end(p_up_to.index, effective_ts)
    prev_selected_map: dict[str, dict] = {}
    prev_as_of_str = None
    if prev_ts is not None:
        prev_res = _evaluate_cross_section(
            p_up_to.loc[p_up_to.index <= prev_ts],
            v_df.loc[v_df.index <= prev_ts] if not v_df.empty else v_df,
            meta_by_symbol,
            universe_symbols,
            prev_ts,
            cfg,
            include_sparklines=False,
        )
        prev_as_of_str = prev_res["as_of"]
        prev_selected_map = {item["symbol"]: item for item in prev_res["selected"]}

    curr_selected_map = {item["symbol"]: item for item in current["selected"]}
    curr_excluded_map = {item["symbol"]: item for item in current["excluded"]}

    buy_list = []
    hold_list = []
    sell_list = []

    for item in current["selected"]:
        sym = item["symbol"]
        if prev_ts is None or sym not in prev_selected_map:
            item["action"] = "BUY"
            buy_list.append(
                {
                    "symbol": sym,
                    "name": item["name"],
                    "sector": item["sector"],
                    "rank": item["rank"],
                    "score": item["score"],
                }
            )
        else:
            item["action"] = "HOLD"
            hold_list.append(
                {
                    "symbol": sym,
                    "name": item["name"],
                    "sector": item["sector"],
                    "rank": item["rank"],
                    "prev_rank": prev_selected_map[sym]["rank"],
                    "score": item["score"],
                }
            )

    for sym, prev_item in prev_selected_map.items():
        if sym not in curr_selected_map:
            curr_rec = curr_excluded_map.get(sym)
            sell_list.append(
                {
                    "symbol": sym,
                    "name": prev_item["name"],
                    "sector": prev_item["sector"],
                    "prev_rank": prev_item["rank"],
                    "current_rank": curr_rec["rank"] if curr_rec else None,
                    "reason": curr_rec["removal_reason"] if curr_rec else "Dropped from portfolio",
                }
            )

    stages = [
        {"key": "universe", "label": "Universe", "count": current["universe_count"]},
        {"key": "filtered", "label": "After Quality Filters", "count": current["filtered_count"]},
        {"key": "scored", "label": "Valid Momentum Score", "count": current["scored_count"]},
        {"key": "selected", "label": "Selected Portfolio", "count": len(current["selected"])},
    ]

    return {
        "as_of": current["as_of"],
        "prev_rebalance_date": prev_as_of_str,
        "params": cfg,
        "stages": stages,
        "selected": current["selected"],
        "changes": {
            "buy": buy_list,
            "sell": sell_list,
            "hold": hold_list,
        },
        "excluded": current["excluded"],
    }
