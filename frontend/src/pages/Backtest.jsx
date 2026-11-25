import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { History, Play, ShieldAlert } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppLayout from "../components/AppLayout";
import DataTable from "../components/DataTable";
import { SkeletonCard, SkeletonChart } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/StateViews";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatINR, formatPct, shortSymbol } from "../lib/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function heatCellClass(ret) {
  if (ret === null || ret === undefined) return "bg-white/[0.02] text-stone-600";
  const pct = ret * 100;
  if (pct >= 8) return "bg-emerald-500/35 text-emerald-200 border-emerald-400/30";
  if (pct >= 3) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/25";
  if (pct > 0) return "bg-emerald-500/10 text-emerald-300 border-emerald-500/15";
  if (pct <= -8) return "bg-rose-500/35 text-rose-200 border-rose-400/30";
  if (pct <= -3) return "bg-rose-500/20 text-rose-300 border-rose-500/25";
  return "bg-rose-500/10 text-rose-300 border-rose-500/15";
}

export default function Backtest() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();

  const initialForm = useMemo(
    () => ({
      top_n: Number(searchParams.get("top_n")) || 20,
      lookback_days: Number(searchParams.get("lookback")) || 252,
      skip_days: Number(searchParams.get("skip")) || 21,
      method: searchParams.get("method") || "vol_adjusted",
      cost_bps: 20,
      start: "",
      end: "",
    }),
    [searchParams]
  );

  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [savedRuns, setSavedRuns] = useState([]);
  const [running, setRunning] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [error, setError] = useState(null);

  const executeBacktest = useCallback(
    async (paramsToRun) => {
      if (!token) return;
      setRunning(true);
      setError(null);
      try {
        const created = await api("/api/backtest", {
          method: "POST",
          body: {
            top_n: paramsToRun.top_n,
            lookback_days: paramsToRun.lookback_days,
            skip_days: paramsToRun.skip_days,
            method: paramsToRun.method,
            cost_bps: paramsToRun.cost_bps,
            start: paramsToRun.start || null,
            end: paramsToRun.end || null,
          },
          token,
        });
        setResult(created);
        setSavedRuns((prev) => [
          {
            id: created.id,
            created_at: created.created_at,
            params: created.params,
            metrics: created.metrics,
          },
          ...prev.filter((r) => r.id !== created.id),
        ]);
      } catch (err) {
        setError(err.message || "Backtest failed");
      } finally {
        setRunning(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    const autorun = searchParams.get("autorun") === "1";

    api("/api/backtests", { token })
      .then(async (res) => {
        if (!active) return;
        const list = res.runs || [];
        setSavedRuns(list);
        if (autorun) {
          await executeBacktest(initialForm);
        } else if (list.length > 0) {
          const full = await api(`/api/backtests/${list[0].id}`, { token });
          if (active) setResult(full);
        }
      })
      .catch(() => {
        // Non-blocking
      })
      .finally(() => {
        if (active) setLoadingSaved(false);
      });

    return () => {
      active = false;
    };
  }, [token, searchParams, initialForm, executeBacktest]);

  const handleRun = (e) => {
    e.preventDefault();
    executeBacktest(form);
  };

  const loadRun = async (runId) => {
    setRunning(true);
    setError(null);
    try {
      const full = await api(`/api/backtests/${runId}`, { token });
      setResult(full);
    } catch (err) {
      setError(err.message || "Could not load saved run");
    } finally {
      setRunning(false);
    }
  };

  const monthlyHeatmapGrid = useMemo(() => {
    const rows = result?.monthly_returns || [];
    const byYear = {};
    rows.forEach((r) => {
      if (!byYear[r.year]) byYear[r.year] = { year: r.year, months: {} };
      byYear[r.year].months[r.month] = r.strategy_return;
    });
    return Object.values(byYear).sort((a, b) => a.year - b.year);
  }, [result]);

  const strat = result?.metrics?.strategy;
  const bench = result?.metrics?.benchmark;

  const rebalanceCols = [
    { key: "signal_date", label: "Signal Date", sortable: true },
    { key: "executed_date", label: "Executed Close", sortable: true },
    { key: "selected_count", label: "Holdings", sortable: true, align: "right" },
    {
      key: "turnover",
      label: "Turnover",
      sortable: true,
      align: "right",
      render: (r) => `${(r.turnover * 100).toFixed(1)}%`,
    },
    {
      key: "cost_paid",
      label: "Cost",
      sortable: true,
      align: "right",
      render: (r) => formatINR(r.cost_paid),
    },
    {
      key: "changes",
      label: "Bought / Sold",
      sortable: false,
      render: (r) => {
        const bought = r.bought || [];
        const sold = r.sold || [];
        return (
          <div className="max-w-[440px] space-y-1 text-[11px]">
            {bought.length > 0 && (
              <div className="truncate text-emerald-300">
                <span className="font-bold">+ Buy ({bought.length}):</span>{" "}
                {bought.map(shortSymbol).join(", ")}
              </div>
            )}
            {sold.length > 0 && (
              <div className="truncate text-rose-300">
                <span className="font-bold">− Sell ({sold.length}):</span>{" "}
                {sold.map(shortSymbol).join(", ")}
              </div>
            )}
            {bought.length === 0 && sold.length === 0 && (
              <span className="text-stone-500">No constituent changes (re-weighted)</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <AppLayout
      title="Strategy Backtester"
      subtitle="Monthly-rebalanced simulation with T+1 close execution lag vs Nifty 200 (^CNX200)"
    >
      <div className="space-y-6">
        <form
          onSubmit={handleRun}
          className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <label className="text-xs text-stone-400">
              Top N
              <input
                type="number"
                min={1}
                max={100}
                value={form.top_n}
                onChange={(e) => setForm((p) => ({ ...p, top_n: Number(e.target.value) }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
              />
            </label>
            <label className="text-xs text-stone-400">
              Lookback
              <input
                type="number"
                min={60}
                max={504}
                value={form.lookback_days}
                onChange={(e) =>
                  setForm((p) => ({ ...p, lookback_days: Number(e.target.value) }))
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
              />
            </label>
            <label className="text-xs text-stone-400">
              Skip Days
              <input
                type="number"
                min={0}
                max={63}
                value={form.skip_days}
                onChange={(e) => setForm((p) => ({ ...p, skip_days: Number(e.target.value) }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
              />
            </label>
            <label className="text-xs text-stone-400 sm:col-span-2 lg:col-span-1">
              Method
              <select
                value={form.method}
                onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-2.5 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
              >
                <option value="vol_adjusted">Vol-Adj</option>
                <option value="raw">Raw</option>
              </select>
            </label>
            <label className="text-xs text-stone-400">
              Cost (bps)
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={form.cost_bps}
                onChange={(e) => setForm((p) => ({ ...p, cost_bps: Number(e.target.value) }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
              />
            </label>
            <label className="text-xs text-stone-400">
              Start (opt)
              <input
                type="date"
                value={form.start}
                onChange={(e) => setForm((p) => ({ ...p, start: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
              />
            </label>
            <label className="text-xs text-stone-400">
              End (opt)
              <input
                type="date"
                value={form.end}
                onChange={(e) => setForm((p) => ({ ...p, end: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={running}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8C4570] to-[#F0867C] px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
              >
                <Play className="h-4 w-4" fill="currentColor" />
                {running ? "Running..." : "Run Backtest"}
              </button>
            </div>
          </div>

          {savedRuns.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-stone-400">
                <History className="h-3.5 w-3.5" />
                Saved Runs:
              </span>
              {savedRuns.slice(0, 6).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => loadRun(r.id)}
                  className={`rounded-lg border px-2.5 py-1 transition ${
                    result?.id === r.id
                      ? "border-[#F0867C]/50 bg-[#F0867C]/15 text-[#F0867C]"
                      : "border-white/10 bg-white/5 text-stone-300 hover:border-white/25"
                  }`}
                >
                  #{r.id} · Top {r.params?.top_n} · {r.params?.cost_bps}bps · CAGR{" "}
                  {r.metrics?.strategy?.cagr != null
                    ? `${(r.metrics.strategy.cagr * 100).toFixed(1)}%`
                    : "—"}
                </button>
              ))}
            </div>
          )}
        </form>

        {error && <ErrorState title="Backtest Error" message={error} />}

        {running || (loadingSaved && !result) ? (
          <div className="space-y-6">
            <SkeletonCard count={4} />
            <SkeletonChart height={320} />
          </div>
        ) : !result ? (
          <EmptyState
            title="Run your first backtest"
            description="Configure your momentum parameters above and click Run Backtest to simulate historical performance."
          />
        ) : (
          <div className="space-y-6">
            {/* Strategy vs Benchmark KPI cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="CAGR (Strategy vs Bench)"
                value={formatPct(strat?.cagr, 2)}
                subtext={`Benchmark (${result.benchmark?.symbol}): ${formatPct(
                  bench?.cagr,
                  2
                )} · Total ${formatPct(strat?.total_return, 1)}`}
                accent="emerald"
              />
              <StatCard
                label="Sharpe & Sortino"
                value={strat?.sharpe_ratio != null ? strat.sharpe_ratio.toFixed(3) : "—"}
                subtext={`Bench Sharpe ${bench?.sharpe_ratio?.toFixed(3) ?? "—"} · Sortino ${
                  strat?.sortino_ratio?.toFixed(2) ?? "—"
                } (Rf 6.5%)`}
                accent="plum"
              />
              <StatCard
                label="Max Drawdown & Calmar"
                value={formatPct(strat?.max_drawdown, 2)}
                subtext={`Bench ${formatPct(bench?.max_drawdown, 1)} · Calmar ${
                  strat?.calmar_ratio?.toFixed(2) ?? "—"
                } · Vol ${((strat?.volatility ?? 0) * 100).toFixed(1)}%`}
                accent="rose"
              />
              <StatCard
                label="Monthly Profile & Costs"
                value={`${strat?.positive_months_pct?.toFixed(1) ?? "—"}% Pos Months`}
                subtext={`Best ${formatPct(strat?.best_month, 1)} / Worst ${formatPct(
                  strat?.worst_month,
                  1
                )} · Costs ${strat?.total_cost_pct?.toFixed(2)}%`}
                accent="amber"
              />
            </div>

            {/* Equity curve */}
            <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
              <h2 className="font-display text-base font-bold text-white">
                Equity Curve ({result.start_date} to {result.end_date})
              </h2>
              <p className="mb-4 text-xs text-stone-400">
                Rebased to {formatINR(result.params?.initial_capital || 1000000, 0)} starting capital
              </p>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={result.equity_curve}
                    margin={{ top: 8, right: 12, left: 6, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#a8a29e", fontSize: 11 }}
                      tickFormatter={(v) => v.slice(2, 7)}
                      minTickGap={35}
                    />
                    <YAxis
                      tick={{ fill: "#a8a29e", fontSize: 11 }}
                      tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                      width={64}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#141220",
                        borderColor: "rgba(255,255,255,0.12)",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                      formatter={(val, name) => [formatINR(val, 0), name]}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Line
                      type="monotone"
                      dataKey="portfolio_value"
                      name="Momentum Strategy"
                      stroke="#F0867C"
                      strokeWidth={2.2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="benchmark_value"
                      name={result.benchmark?.name || "Benchmark"}
                      stroke="#38bdf8"
                      strokeWidth={1.75}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Drawdown + Yearly returns */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
                <h3 className="font-display text-base font-bold text-white">
                  Strategy Drawdown
                </h3>
                <p className="mb-3 text-xs text-stone-400">
                  Peak {strat?.max_drawdown_peak_date} → Trough {strat?.max_drawdown_trough_date}
                </p>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={result.equity_curve}
                      margin={{ top: 4, right: 12, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#a8a29e", fontSize: 10 }}
                        tickFormatter={(v) => v.slice(2, 7)}
                        minTickGap={35}
                      />
                      <YAxis
                        tick={{ fill: "#a8a29e", fontSize: 10 }}
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#141220",
                          borderColor: "rgba(255,255,255,0.12)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        formatter={(val) => [`${(Number(val) * 100).toFixed(2)}%`, "Drawdown"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="drawdown"
                        stroke="#fb7185"
                        fill="rgba(251,113,133,0.22)"
                        strokeWidth={1.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
                <h3 className="font-display text-base font-bold text-white">
                  Yearly Returns Table
                </h3>
                <p className="mb-3 text-xs text-stone-400">
                  Calendar-year strategy vs {result.benchmark?.symbol}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase text-stone-400">
                        <th className="py-2 text-left">Year</th>
                        <th className="py-2 text-right">Strategy</th>
                        <th className="py-2 text-right">Benchmark</th>
                        <th className="py-2 text-right">Excess</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06] tabular-nums">
                      {(result.yearly_returns || []).map((y) => (
                        <tr key={y.year}>
                          <td className="py-2.5 font-semibold text-white">{y.year}</td>
                          <td
                            className={`py-2.5 text-right font-semibold ${
                              y.strategy_return >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {formatPct(y.strategy_return, 2)}
                          </td>
                          <td className="py-2.5 text-right text-stone-300">
                            {formatPct(y.benchmark_return, 2)}
                          </td>
                          <td
                            className={`py-2.5 text-right font-medium ${
                              y.excess_return >= 0 ? "text-emerald-300" : "text-rose-300"
                            }`}
                          >
                            {formatPct(y.excess_return, 2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* Monthly returns heatmap */}
            {monthlyHeatmapGrid.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
                <h3 className="font-display text-base font-bold text-white">
                  Monthly Returns Heatmap (Strategy)
                </h3>
                <p className="mb-4 text-xs text-stone-400">
                  Calendar-month percentage returns across the backtest horizon
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[740px] border-separate border-spacing-1 text-center text-xs">
                    <thead>
                      <tr className="text-stone-400">
                        <th className="px-2 py-1 text-left">Year</th>
                        {MONTHS.map((m) => (
                          <th key={m} className="px-1.5 py-1 font-medium">
                            {m}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyHeatmapGrid.map((yr) => (
                        <tr key={yr.year}>
                          <td className="px-2 py-1.5 text-left font-bold text-white">
                            {yr.year}
                          </td>
                          {MONTHS.map((_, idx) => {
                            const val = yr.months[idx + 1];
                            return (
                              <td
                                key={idx}
                                className={`rounded-md border px-1.5 py-1.5 font-semibold tabular-nums ${heatCellClass(
                                  val
                                )}`}
                              >
                                {val !== undefined && val !== null
                                  ? `${(val * 100).toFixed(1)}%`
                                  : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Rebalances log with Bought / Sold */}
            <section className="space-y-3">
              <h3 className="font-display text-base font-bold text-white">
                Rebalance History ({result.rebalances?.length || 0} monthly rebalances)
              </h3>
              <DataTable
                columns={rebalanceCols}
                rows={result.rebalances || []}
                rowKey="executed_date"
                defaultSortKey="executed_date"
                defaultSortDir="desc"
                pageSize={10}
              />
            </section>

            {/* Clear Limitations notice */}
            <section className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5 text-xs leading-relaxed text-amber-100/90">
              <div className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-amber-200">
                <ShieldAlert className="h-4 w-4" />
                Simulation Limitations &amp; Disclaimer
              </div>
              <ul className="list-disc space-y-1 pl-5 text-amber-100/80">
                <li>
                  <strong>Survivorship bias</strong>: The universe uses today&apos;s Nifty 200 constituents rather than historical point-in-time index membership.
                </li>
                <li>
                  <strong>Limited history</strong>: Covers ~6 years of daily adjusted data (~5 years post-warmup), reflecting a single macro cycle.
                </li>
                <li>
                  <strong>Simplified cost model</strong>: Applies a flat {result.params?.cost_bps ?? 20} bps cost on traded value and does not model STCG/LTCG taxes, bid-ask spreads, or liquidity impact.
                </li>
                <li>
                  <strong>Educational &amp; research only</strong>: Historical backtest output is not investment advice or a promise of future performance.
                </li>
              </ul>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
