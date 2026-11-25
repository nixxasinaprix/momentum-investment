"""Protected research endpoints for screener, market overview, and stock analysis."""

from datetime import date, timedelta
import math
import time
from flask import Blueprint, jsonify, request
import numpy as np
import pandas as pd
from sqlalchemy import func

from auth import login_required
from data_access import load_benchmark_series, load_price_matrix
from indicators import (
    classify_trend,
    classify_trend_series,
    compute_52w_high_low,
    compute_period_returns,
    compute_relative_strength,
    compute_rsi,
    compute_sma,
    compute_smas,
    describe_trend,
)
from models import Price, Stock, db
from signals import ALLOWED_METHODS, compute_momentum, compute_scores, compute_volatility

research_bp = Blueprint("research", __name__, url_prefix="/api")

CACHE_TTL_SECONDS = 300.0
_CACHE: dict[tuple, tuple[float, object]] = {}

RANGE_DAYS = {"1y": 365, "3y": 365 * 3 + 1, "5y": 365 * 5 + 2}


def _clean_num(val) -> float | None:
    if val is None or pd.isna(val):
        return None
    num = float(val)
    return num if math.isfinite(num) else None


def _get_cache(key: tuple):
    entry = _CACHE.get(key)
    if entry is None:
        return None
    expires_at, value = entry
    if time.monotonic() >= expires_at:
        _CACHE.pop(key, None)
        return None
    return value


def _set_cache(key: tuple, value: object, ttl: float = CACHE_TTL_SECONDS) -> None:
    _CACHE[key] = (time.monotonic() + ttl, value)


def _universe_cache_tag() -> tuple[str, int]:
    latest = db.session.query(func.max(Price.date)).scalar()
    stock_count = db.session.query(func.count(Stock.id)).filter(Stock.is_active.is_(True)).scalar()
    return (latest.isoformat() if latest else "none", int(stock_count or 0))


def _build_screener_data() -> dict:
    """Compute and cache full-universe screener rows and breadth history."""
    tag = _universe_cache_tag()
    cache_key = ("screener", *tag)
    cached = _get_cache(cache_key)
    if cached is not None:
        return cached

    stocks = Stock.query.filter_by(is_active=True).order_by(Stock.symbol.asc()).all()
    prices = load_price_matrix(db.session)
    if prices.empty or not stocks:
        payload = {
            "as_of": None,
            "count": 0,
            "stocks": [],
            "breadth_history": [],
        }
        _set_cache(cache_key, payload)
        return payload

    as_of_ts = prices.index[-1]
    as_of_str = as_of_ts.date().isoformat()

    filled = prices.ffill()
    last_price = filled.iloc[-1]
    sma20_df = compute_sma(filled, 20)
    sma50_df = compute_sma(filled, 50)
    sma200_df = compute_sma(filled, 200)
    rsi_df = compute_rsi(filled, 14)

    sma20 = sma20_df.iloc[-1]
    sma50 = sma50_df.iloc[-1]
    sma200 = sma200_df.iloc[-1]
    rsi14 = rsi_df.iloc[-1]

    hl = compute_52w_high_low(filled, window=252)
    returns_df = compute_period_returns(prices, as_of=as_of_ts)
    scores_df = compute_scores(prices, as_of=as_of_ts, method="vol_adjusted")
    score_map = scores_df.set_index("symbol").to_dict(orient="index")
    trends = classify_trend_series(last_price, sma50, sma200)

    # Previous month-end rank for rank-change calculation
    month_ends = (
        prices.index.to_series()
        .groupby(prices.index.to_period("M"))
        .last()
        .tolist()
    )
    prev_month_ts = None
    if len(month_ends) >= 2:
        last_me = pd.Timestamp(month_ends[-1]).normalize()
        prev_month_ts = (
            pd.Timestamp(month_ends[-2])
            if last_me >= as_of_ts.normalize()
            else last_me
        )
    prev_rank_map = {}
    if prev_month_ts is not None:
        prev_scores_df = compute_scores(
            prices.loc[:prev_month_ts], as_of=prev_month_ts, method="vol_adjusted"
        )
        if not prev_scores_df.empty:
            prev_rank_map = dict(
                zip(prev_scores_df["symbol"], prev_scores_df["rank"].astype(int))
            )

    spark_tail = filled.iloc[-30:]

    rows = []
    for stock in stocks:
        sym = stock.symbol
        if sym not in prices.columns:
            continue
        sc_info = score_map.get(sym, {})
        cur_rank = int(sc_info["rank"]) if "rank" in sc_info else None
        prev_rank = prev_rank_map.get(sym)
        rank_change = (
            int(prev_rank - cur_rank)
            if cur_rank is not None and prev_rank is not None
            else None
        )
        ret_row = returns_df.loc[sym] if sym in returns_df.index else {}
        spark_vals = [
            round(float(v), 2)
            for v in spark_tail[sym].dropna().tolist()
        ]

        mcap_cr = (
            round(float(stock.market_cap) / 1e7, 2)
            if stock.market_cap is not None and float(stock.market_cap) > 0
            else None
        )
        rows.append(
            {
                "symbol": sym,
                "name": stock.name,
                "sector": stock.sector or "Other",
                "market_cap_cr": mcap_cr,
                "market_cap_status": "known" if mcap_cr is not None else "unknown",
                "last_price": _clean_num(last_price.get(sym)),
                "ret_1m": _clean_num(ret_row.get("ret_1m") if hasattr(ret_row, "get") else None),
                "ret_3m": _clean_num(ret_row.get("ret_3m") if hasattr(ret_row, "get") else None),
                "ret_6m": _clean_num(ret_row.get("ret_6m") if hasattr(ret_row, "get") else None),
                "ret_12_1m": _clean_num(ret_row.get("ret_12_1m") if hasattr(ret_row, "get") else None),
                "volatility": _clean_num(ret_row.get("volatility") if hasattr(ret_row, "get") else None),
                "score": _clean_num(sc_info.get("score")),
                "rank": cur_rank,
                "rank_prev_month": prev_rank,
                "rank_change": rank_change,
                "pct_below_52w_high": _clean_num(hl["pct_below_52w_high"].get(sym)),
                "high_52w": _clean_num(hl["high_52w"].get(sym)),
                "low_52w": _clean_num(hl["low_52w"].get(sym)),
                "sma_20": _clean_num(sma20.get(sym)),
                "sma_50": _clean_num(sma50.get(sym)),
                "sma_200": _clean_num(sma200.get(sym)),
                "rsi_14": _clean_num(rsi14.get(sym)),
                "trend": str(trends.get(sym, "Insufficient data")),
                "sparkline": spark_vals,
            }
        )

    rows.sort(key=lambda r: (r["rank"] is None, r["rank"] if r["rank"] is not None else 999999, r["symbol"]))

    # Breadth history over trailing 252 trading days (% of stocks with valid DMA above 50DMA / 200DMA)
    tail_dates = filled.index[-252:]
    above_50 = (filled.loc[tail_dates] > sma50_df.loc[tail_dates])
    valid_50 = sma50_df.loc[tail_dates].notna()
    above_200 = (filled.loc[tail_dates] > sma200_df.loc[tail_dates])
    valid_200 = sma200_df.loc[tail_dates].notna()

    pct_50_series = (above_50.sum(axis=1) / valid_50.sum(axis=1).replace(0, np.nan)) * 100.0
    pct_200_series = (above_200.sum(axis=1) / valid_200.sum(axis=1).replace(0, np.nan)) * 100.0

    breadth_history = [
        {
            "date": d.date().isoformat(),
            "pct_above_50dma": round(float(v50), 2) if pd.notna(v50) else None,
            "pct_above_200dma": round(float(v200), 2) if pd.notna(v200) else None,
        }
        for d, v50, v200 in zip(tail_dates, pct_50_series, pct_200_series)
    ]

    payload = {
        "as_of": as_of_str,
        "count": len(rows),
        "stocks": rows,
        "breadth_history": breadth_history,
    }
    _set_cache(cache_key, payload)
    return payload


def _get_monthly_rank_map(prices: pd.DataFrame, month_end_dates: list[pd.Timestamp]) -> dict[str, dict[str, dict]]:
    """Compute and cache monthly universe score/rank snapshots for rank history."""
    tag = _universe_cache_tag()
    result: dict[str, dict[str, dict]] = {}
    for m_date in month_end_dates:
        m_str = m_date.date().isoformat()
        c_key = ("month_ranks", *tag, m_str)
        cached = _get_cache(c_key)
        if cached is None:
            scores = compute_scores(prices.loc[:m_date], as_of=m_date, method="vol_adjusted")
            univ_size = len(scores)
            snap = {
                row.symbol: {
                    "rank": int(row.rank),
                    "score": _clean_num(row.score),
                    "universe_size": univ_size,
                }
                for row in scores.itertuples(index=False)
            }
            _set_cache(c_key, snap)
            cached = snap
        result[m_str] = cached
    return result


@research_bp.route("/screener", methods=["GET"])
@login_required
def get_screener():
    """Return all tracked stocks with returns, SMAs, RSI, momentum score, rank, and trend."""
    data = _build_screener_data()
    return (
        jsonify(
            {
                "as_of": data["as_of"],
                "count": data["count"],
                "stocks": data["stocks"],
            }
        ),
        200,
    )


@research_bp.route("/market/overview", methods=["GET"])
@login_required
def get_market_overview():
    """Return dashboard summary cards, top/bottom 10 momentum, sector heatmap, and breadth."""
    tag = _universe_cache_tag()
    cache_key = ("overview", *tag)
    cached = _get_cache(cache_key)
    if cached is not None:
        return jsonify(cached), 200

    screener = _build_screener_data()
    stocks = screener["stocks"]
    scored = [s for s in stocks if s["score"] is not None and s["rank"] is not None]

    above_50_valid = [s for s in stocks if s["sma_50"] is not None and s["last_price"] is not None]
    above_200_valid = [s for s in stocks if s["sma_200"] is not None and s["last_price"] is not None]
    pct_above_50 = (
        round(sum(1 for s in above_50_valid if s["last_price"] > s["sma_50"]) / len(above_50_valid) * 100.0, 2)
        if above_50_valid
        else 0.0
    )
    pct_above_200 = (
        round(sum(1 for s in above_200_valid if s["last_price"] > s["sma_200"]) / len(above_200_valid) * 100.0, 2)
        if above_200_valid
        else 0.0
    )

    sector_buckets: dict[str, list[dict]] = {}
    for s in stocks:
        sector_buckets.setdefault(s["sector"] or "Other", []).append(s)

    sectors = []
    for sec, items in sector_buckets.items():
        sec_scored = [x for x in items if x["score"] is not None]
        sec_200 = [x for x in items if x["sma_200"] is not None and x["last_price"] is not None]
        avg_score = (
            sum(x["score"] for x in sec_scored) / len(sec_scored) if sec_scored else None
        )
        avg_mom = (
            sum(x["ret_12_1m"] for x in sec_scored if x["ret_12_1m"] is not None) / len(sec_scored)
            if sec_scored
            else None
        )
        sec_above_200 = (
            round(sum(1 for x in sec_200 if x["last_price"] > x["sma_200"]) / len(sec_200) * 100.0, 1)
            if sec_200
            else None
        )
        top_item = min(sec_scored, key=lambda x: x["rank"]) if sec_scored else None
        sectors.append(
            {
                "sector": sec,
                "count": len(items),
                "eligible_count": len(sec_scored),
                "avg_score": _clean_num(avg_score),
                "avg_momentum": _clean_num(avg_mom),
                "pct_above_200dma": sec_above_200,
                "top_symbol": top_item["symbol"] if top_item else None,
            }
        )

    sectors.sort(
        key=lambda x: (x["avg_score"] is None, -(x["avg_score"] or 0.0))
    )

    trend_counts: dict[str, int] = {}
    for s in stocks:
        trend_counts[s["trend"]] = trend_counts.get(s["trend"], 0) + 1

    top_10 = scored[:10]
    bottom_10 = sorted(scored[-10:], key=lambda x: x["score"]) if scored else []
    top_sector = next((sec for sec in sectors if sec["avg_score"] is not None), None)
    strongest_stock = top_10[0] if top_10 else None

    payload = {
        "as_of": screener["as_of"],
        "summary": {
            "total_stocks": screener["count"],
            "eligible_stocks": len(scored),
            "pct_above_50dma": pct_above_50,
            "pct_above_200dma": pct_above_200,
            "top_sector": top_sector,
            "strongest_stock": strongest_stock,
            "trend_counts": trend_counts,
        },
        "top_10": top_10,
        "bottom_10": bottom_10,
        "sectors": sectors,
        "breadth_history": screener["breadth_history"],
    }
    _set_cache(cache_key, payload)
    return jsonify(payload), 200


@research_bp.route("/stocks/<symbol>/analysis", methods=["GET"])
@login_required
def get_stock_analysis(symbol: str):
    """Return full indicator series, rank history, and momentum calculation breakdown."""
    range_param = (request.args.get("range") or "1y").strip().lower()
    if range_param not in RANGE_DAYS:
        return jsonify({"error": "Invalid 'range'. Must be one of: 1y, 3y, 5y."}), 400

    normalized = symbol.strip().upper()
    stock = Stock.query.filter_by(symbol=normalized).first()
    if stock is None:
        return jsonify({"error": f"Stock '{normalized}' not found."}), 404

    bars = (
        Price.query.filter_by(stock_id=stock.id)
        .order_by(Price.date.asc())
        .all()
    )
    if not bars:
        return jsonify({"error": f"No price history found for '{normalized}'."}), 404

    dates = pd.to_datetime([b.date for b in bars])
    close_s = pd.Series([float(b.close) for b in bars], index=dates, dtype=float)
    vol_s = pd.Series(
        [int(b.volume) if b.volume is not None else None for b in bars],
        index=dates,
        dtype="float64",
    )

    smas = compute_smas(close_s, windows=(20, 50, 200))
    rsi = compute_rsi(close_s, period=14)

    latest_ts = dates[-1]
    cutoff_ts = latest_ts - pd.Timedelta(days=RANGE_DAYS[range_param])

    bench_s = load_benchmark_series(db.session, symbol="^CNX200")
    if bench_s.empty:
        bench_s = load_benchmark_series(db.session, symbol="^NSEI")

    sliced_close = close_s.loc[close_s.index >= cutoff_ts]
    rel_strength = compute_relative_strength(sliced_close, bench_s)

    series = []
    for d in sliced_close.index:
        vol_val = vol_s.loc[d]
        series.append(
            {
                "date": d.date().isoformat(),
                "close": _clean_num(close_s.loc[d]),
                "volume": int(vol_val) if pd.notna(vol_val) else None,
                "sma_20": _clean_num(smas.loc[d, "sma_20"]),
                "sma_50": _clean_num(smas.loc[d, "sma_50"]),
                "sma_200": _clean_num(smas.loc[d, "sma_200"]),
                "rsi_14": _clean_num(rsi.loc[d]),
                "relative_strength": _clean_num(rel_strength.loc[d]),
            }
        )

    # Summary metrics & current trend
    last_close = float(close_s.iloc[-1])
    last_sma50 = _clean_num(smas["sma_50"].iloc[-1])
    last_sma200 = _clean_num(smas["sma_200"].iloc[-1])
    trend = classify_trend(last_close, last_sma50, last_sma200)
    hl = compute_52w_high_low(close_s, window=252)

    single_df = close_s.to_frame(name=stock.symbol)
    ret_1m = (last_close / float(close_s.iloc[-22]) - 1.0) if len(close_s) > 21 else None
    ret_3m = (last_close / float(close_s.iloc[-64]) - 1.0) if len(close_s) > 63 else None
    ret_6m = (last_close / float(close_s.iloc[-127]) - 1.0) if len(close_s) > 126 else None

    lookback_days = int(request.args.get("lookback") or 252)
    skip_days = int(request.args.get("skip") or 21)
    lookback_days = max(60, min(504, lookback_days))
    skip_days = max(0, min(63, min(skip_days, lookback_days - 1)))

    mom_s = compute_momentum(single_df, latest_ts, lookback_days=lookback_days, skip_days=skip_days)
    vol_s_ann = compute_volatility(single_df, latest_ts, window=lookback_days)
    mom_val = _clean_num(mom_s.iloc[0])
    vol_ann = _clean_num(vol_s_ann.iloc[0])

    # Universe rank & monthly rank history
    prices_matrix = load_price_matrix(db.session)
    current_scores = compute_scores(
        prices_matrix,
        as_of=latest_ts,
        method="vol_adjusted",
        lookback_days=lookback_days,
        skip_days=skip_days,
    )
    cur_row = current_scores.loc[current_scores["symbol"] == stock.symbol]
    current_rank = int(cur_row["rank"].iloc[0]) if not cur_row.empty else None
    current_score = _clean_num(cur_row["score"].iloc[0]) if not cur_row.empty else None
    universe_size = len(current_scores)

    month_ends = (
        prices_matrix.index.to_series()
        .groupby(prices_matrix.index.to_period("M"))
        .last()
    )
    month_ends_in_range = [pd.Timestamp(d) for d in month_ends if pd.Timestamp(d) >= cutoff_ts]
    rank_snapshots = _get_monthly_rank_map(prices_matrix, month_ends_in_range)

    rank_history = []
    for m_date in month_ends_in_range:
        m_str = m_date.date().isoformat()
        info = rank_snapshots.get(m_str, {}).get(stock.symbol)
        if info is not None:
            rank_history.append(
                {
                    "date": m_str,
                    "rank": info["rank"],
                    "score": info["score"],
                    "universe_size": info["universe_size"],
                }
            )

    # Step-by-step numbers behind current momentum score
    # Use the stock's trading positions in the universe matrix if aligned, or its own series
    if stock.symbol in prices_matrix.columns:
        mat_sliced = prices_matrix.loc[prices_matrix.index <= latest_ts, stock.symbol]
    else:
        mat_sliced = close_s

    history_before = int(mat_sliced.iloc[:-1].notna().sum()) if len(mat_sliced) > 1 else 0
    if len(mat_sliced) > lookback_days + skip_days and history_before >= lookback_days + skip_days:
        date_252 = mat_sliced.index[-1 - lookback_days].date().isoformat()
        price_252 = _clean_num(mat_sliced.iloc[-1 - lookback_days])
        date_21 = mat_sliced.index[-1 - skip_days].date().isoformat()
        price_21 = _clean_num(mat_sliced.iloc[-1 - skip_days])
    else:
        date_252 = None
        price_252 = None
        date_21 = None
        price_21 = None

    eligible = current_score is not None
    reason = None
    if not eligible:
        reason = (
            f"Requires at least {lookback_days + skip_days} trading days of history before "
            f"{latest_ts.date().isoformat()} and valid prices at t-21 and t-252 (has {history_before} prior days)."
        )

    return (
        jsonify(
            {
                "stock": stock.to_dict(),
                "range": range_param,
                "as_of": latest_ts.date().isoformat(),
                "summary": {
                    "last_price": _clean_num(last_close),
                    "ret_1m": _clean_num(ret_1m),
                    "ret_3m": _clean_num(ret_3m),
                    "ret_6m": _clean_num(ret_6m),
                    "ret_12_1m": mom_val,
                    "volatility": vol_ann,
                    "score": current_score,
                    "rank": current_rank,
                    "universe_size": universe_size,
                    "high_52w": _clean_num(hl["high_52w"]),
                    "low_52w": _clean_num(hl["low_52w"]),
                    "pct_below_52w_high": _clean_num(hl["pct_below_52w_high"]),
                    "sma_20": _clean_num(smas["sma_20"].iloc[-1]),
                    "sma_50": last_sma50,
                    "sma_200": last_sma200,
                    "rsi_14": _clean_num(rsi.iloc[-1]),
                    "trend": trend,
                    "trend_explanation": describe_trend(trend),
                },
                "series": series,
                "rank_history": rank_history,
                "score_breakdown": {
                    "eligible": eligible,
                    "reason": reason,
                    "as_of": latest_ts.date().isoformat(),
                    "lookback_days": lookback_days,
                    "skip_days": skip_days,
                    "method": "vol_adjusted",
                    "date_252_ago": date_252,
                    "price_252_ago": price_252,
                    "date_21_ago": date_21,
                    "price_21_ago": price_21,
                    "momentum_12_1": mom_val,
                    "volatility_ann": vol_ann,
                    "score": current_score,
                    "rank": current_rank,
                    "universe_size": universe_size,
                },
            }
        ),
        200,
    )


def _parse_query_int(name: str, default: int, min_val: int, max_val: int) -> tuple[int | None, str | None]:
    raw = request.args.get(name)
    if raw is None or raw == "":
        return default, None
    try:
        val = int(raw)
    except ValueError:
        return None, f"Parameter '{name}' must be an integer."
    if val < min_val or val > max_val:
        return None, f"Parameter '{name}' must be between {min_val} and {max_val}."
    return val, None


@research_bp.route("/strategy/preview", methods=["GET"])
@login_required
def get_strategy_preview():
    """Lightweight preview of the current top-N portfolio for live Strategy Lab sliders."""
    method = (request.args.get("method") or "vol_adjusted").strip()
    if method not in ALLOWED_METHODS:
        return (
            jsonify(
                {"error": f"Invalid 'method'. Must be one of: {', '.join(ALLOWED_METHODS)}."}
            ),
            400,
        )

    top, err = _parse_query_int("top", 20, 1, 100)
    if err:
        return jsonify({"error": err}), 400

    lookback, err = _parse_query_int("lookback", 252, 60, 504)
    if err:
        return jsonify({"error": err}), 400

    skip, err = _parse_query_int("skip", 21, 0, 63)
    if err:
        return jsonify({"error": err}), 400

    if skip >= lookback:
        return jsonify({"error": "Parameter 'skip' must be strictly less than 'lookback'."}), 400

    tag = _universe_cache_tag()
    preview_key = ("strategy_preview", *tag, method, top, lookback, skip)
    cached_preview = _get_cache(preview_key)
    if cached_preview is not None:
        return jsonify(cached_preview), 200

    matrix_key = ("full_price_matrix", *tag)
    cached_matrix = _get_cache(matrix_key)
    if cached_matrix is None:
        prices = load_price_matrix(db.session)
        meta = {
            s.symbol: (s.name, s.sector or "Other")
            for s in Stock.query.filter_by(is_active=True).all()
        }
        cached_matrix = (prices, meta)
        _set_cache(matrix_key, cached_matrix)

    prices, stock_meta = cached_matrix
    if prices.empty:
        return jsonify({"error": "No price data available in database."}), 404

    latest_ts = prices.index[-1]
    scores = compute_scores(
        prices,
        as_of=latest_ts,
        method=method,
        lookback_days=lookback,
        skip_days=skip,
    )
    selected_df = scores.head(top)
    weight = (1.0 / len(selected_df)) if len(selected_df) > 0 else 0.0

    # Compare against defaults (vol_adjusted, top=20, lookback=252, skip=21)
    default_scores = compute_scores(
        prices,
        as_of=latest_ts,
        method="vol_adjusted",
        lookback_days=252,
        skip_days=21,
    )
    default_top = set(default_scores.head(20)["symbol"].tolist())
    current_top = set(selected_df["symbol"].tolist())

    portfolio = []
    sector_counts: dict[str, int] = {}
    for row in selected_df.itertuples(index=False):
        name, sector = stock_meta.get(row.symbol, (row.symbol, "Other"))
        sector_counts[sector] = sector_counts.get(sector, 0) + 1
        portfolio.append(
            {
                "rank": int(row.rank),
                "symbol": row.symbol,
                "name": name,
                "sector": sector,
                "momentum": _clean_num(row.momentum),
                "volatility": _clean_num(row.volatility),
                "score": _clean_num(row.score),
                "weight": round(weight, 6),
                "in_default": row.symbol in default_top,
            }
        )

    sectors = sorted(
        [{"sector": k, "count": v} for k, v in sector_counts.items()],
        key=lambda x: (-x["count"], x["sector"]),
    )

    payload = {
        "as_of": latest_ts.date().isoformat(),
        "universe_size": len(scores),
        "parameters": {
            "method": method,
            "top": top,
            "lookback": lookback,
            "skip": skip,
        },
        "comparison_to_default": {
            "overlap_count": len(current_top & default_top),
            "added": sorted(current_top - default_top),
            "removed": sorted(default_top - current_top),
        },
        "sectors": sectors,
        "portfolio": portfolio,
    }
    _set_cache(preview_key, payload)
    return jsonify(payload), 200
