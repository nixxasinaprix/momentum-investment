"""
CLI sanity script to run a momentum backtest on local DB data and print results.

Usage (from /backend):
    python -m scripts.run_backtest
    python -m scripts.run_backtest --cost-bps 0
    python -m scripts.run_backtest --top-n 10 --method raw
"""

import argparse
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from backtest import run_backtest  # noqa: E402
from data_access import load_benchmark_series, load_price_matrix  # noqa: E402
from models import db  # noqa: E402
from server import app  # noqa: E402
from signals import ALLOWED_METHODS  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a monthly-rebalanced momentum backtest on local DB prices."
    )
    parser.add_argument("--top-n", type=int, default=20, help="Number of holdings (default: 20).")
    parser.add_argument("--lookback", type=int, default=252, help="Lookback days (default: 252).")
    parser.add_argument("--skip", type=int, default=21, help="Skip days (default: 21).")
    parser.add_argument(
        "--method",
        choices=ALLOWED_METHODS,
        default="vol_adjusted",
        help="Signal scoring method (default: vol_adjusted).",
    )
    parser.add_argument(
        "--cost-bps",
        type=float,
        default=20.0,
        help="Transaction cost in bps per unit traded (default: 20).",
    )
    parser.add_argument(
        "--initial-capital",
        type=float,
        default=1_000_000.0,
        help="Initial portfolio capital (default: 1000000).",
    )
    parser.add_argument(
        "--risk-free-rate",
        type=float,
        default=0.065,
        help="Annual risk-free rate as decimal (default: 0.065).",
    )
    parser.add_argument("--start", type=str, default=None, help="Optional start YYYY-MM-DD.")
    parser.add_argument("--end", type=str, default=None, help="Optional end YYYY-MM-DD.")
    parser.add_argument(
        "--benchmark",
        type=str,
        default="^CNX200",
        help="Benchmark symbol in benchmark_prices (default: ^CNX200).",
    )
    return parser.parse_args()


def _fmt_pct(val: float | None) -> str:
    return f"{val * 100:>8.2f}%" if val is not None else f"{'N/A':>9}"


def _fmt_num(val: float | None) -> str:
    return f"{val:>9.3f}" if val is not None else f"{'N/A':>9}"


def main() -> None:
    args = parse_args()
    params = {
        "top_n": args.top_n,
        "lookback_days": args.lookback,
        "skip_days": args.skip,
        "method": args.method,
        "rebalance": "monthly",
        "cost_bps": args.cost_bps,
        "initial_capital": args.initial_capital,
        "risk_free_rate": args.risk_free_rate,
        "start": args.start,
        "end": args.end,
    }

    with app.app_context():
        prices = load_price_matrix(db.session, start=None, end=args.end)
        benchmark = load_benchmark_series(db.session, symbol=args.benchmark, start=None, end=args.end)
        if benchmark.empty:
            print(f"Benchmark '{args.benchmark}' not found in DB. Run: python -m scripts.ingest_benchmark")
            return

    res = run_backtest(prices, benchmark, params)
    strat = res["metrics"]["strategy"]
    bench = res["metrics"]["benchmark"]
    rf_pct = res["metrics"]["risk_free_rate"] * 100.0

    print(
        f"\nBacktest Summary | {res['start_date']} to {res['end_date']} | "
        f"method={args.method} | top_n={args.top_n} | lookback={args.lookback} | "
        f"skip={args.skip} | cost_bps={args.cost_bps:g} | benchmark={args.benchmark} | "
        f"rf={rf_pct:.2f}%"
    )
    print("-" * 64)
    print(f"{'Metric':<32}  {'Strategy':>12}  {'Benchmark':>12}")
    print("-" * 64)

    rows = [
        ("Total Return", _fmt_pct(strat["total_return"]), _fmt_pct(bench["total_return"])),
        ("CAGR", _fmt_pct(strat["cagr"]), _fmt_pct(bench["cagr"])),
        ("Annualised Volatility", _fmt_pct(strat["volatility"]), _fmt_pct(bench["volatility"])),
        ("Sharpe Ratio", _fmt_num(strat["sharpe_ratio"]), _fmt_num(bench["sharpe_ratio"])),
        ("Sortino Ratio", _fmt_num(strat["sortino_ratio"]), _fmt_num(bench["sortino_ratio"])),
        ("Max Drawdown", _fmt_pct(strat["max_drawdown"]), _fmt_pct(bench["max_drawdown"])),
        ("Max DD Peak Date", f"{strat['max_drawdown_peak_date']:>12}", f"{bench['max_drawdown_peak_date']:>12}"),
        ("Max DD Trough Date", f"{strat['max_drawdown_trough_date']:>12}", f"{bench['max_drawdown_trough_date']:>12}"),
        (
            "Max DD Recovery Date",
            f"{(strat['max_drawdown_recovery_date'] or 'Unrecovered'):>12}",
            f"{(bench['max_drawdown_recovery_date'] or 'Unrecovered'):>12}",
        ),
        ("Calmar Ratio", _fmt_num(strat["calmar_ratio"]), _fmt_num(bench["calmar_ratio"])),
        ("Best Month", _fmt_pct(strat["best_month"]), _fmt_pct(bench["best_month"])),
        ("Worst Month", _fmt_pct(strat["worst_month"]), _fmt_pct(bench["worst_month"])),
        (
            "Positive Months",
            f"{strat['positive_months_pct']:>8.1f}%" if strat["positive_months_pct"] is not None else f"{'N/A':>9}",
            f"{bench['positive_months_pct']:>8.1f}%" if bench["positive_months_pct"] is not None else f"{'N/A':>9}",
        ),
        ("Avg Annual Turnover", _fmt_pct(strat["avg_annual_turnover"]), f"{'-':>9}"),
        ("Total Costs (% Init Cap)", f"{strat['total_cost_pct']:>8.2f}%", f"{'-':>9}"),
        ("Avg Holdings", f"{strat['avg_holdings']:>9.2f}", f"{'-':>9}"),
    ]

    for label, s_val, b_val in rows:
        print(f"{label:<32}  {s_val:>12}  {b_val:>12}")

    print("\nYearly Returns")
    print("-" * 52)
    print(f"{'Year':<8}  {'Strategy':>12}  {'Benchmark':>12}  {'Excess':>12}")
    print("-" * 52)
    for yr in res["yearly_returns"]:
        print(
            f"{yr['year']:<8}  "
            f"{yr['strategy_return'] * 100:>11.2f}%  "
            f"{yr['benchmark_return'] * 100:>11.2f}%  "
            f"{yr['excess_return'] * 100:>11.2f}%"
        )

    print(f"\nFirst 5 Rebalances (out of {len(res['rebalances'])})")
    print("-" * 76)
    for reb in res["rebalances"][:5]:
        syms = ", ".join(reb["selected_symbols"])
        print(
            f"Signal {reb['signal_date']} -> Exec {reb['executed_date']} | "
            f"n={reb['selected_count']} | turnover={reb['turnover'] * 100:.1f}% | "
            f"cost={reb['cost_paid']:.2f}"
        )
        print(f"  Holdings: {syms}")

    if res["data_warnings"]:
        print(f"\nData Warnings ({len(res['data_warnings'])} total; showing up to 5):")
        for w in res["data_warnings"][:5]:
            print(f"  [{w['date']}] {w['symbol'] or 'PORTFOLIO'}: {w['message']}")
    print()


if __name__ == "__main__":
    main()
