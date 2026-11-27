import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { History, Play, ShieldAlert } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppLayout from "../components/AppLayout";
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  GlassCard,
  Input,
  PageContainer,
  Select,
  SkeletonCard,
  SkeletonChart,
  StatCard,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { usePipelineParams } from "../context/PipelineContext";
import { api } from "../lib/api";
import { useChartTheme } from "../lib/chartTheme";
import { formatINR, formatPct, shortSymbol } from "../lib/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function heatCellClass(ret) {
  if (ret === null || ret === undefined) {
    return "border-[var(--border-table)] bg-brand-plum/[0.04] text-[var(--text-muted)] dark:bg-brand-plumDark/15";
  }
  const pct = ret * 100;
  if (pct >= 8) {
    return "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-500/35 dark:text-emerald-200";
  }
  if (pct >= 3) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-300";
  }
  if (pct > 0) {
    return "border-emerald-200/70 bg-emerald-50/60 text-emerald-700 dark:border-emerald-500/15 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  if (pct <= -8) {
    return "border-red-300 bg-red-100 text-red-900 dark:border-red-400/30 dark:bg-red-500/35 dark:text-red-200";
  }
  if (pct <= -3) {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-500/25 dark:bg-red-500/20 dark:text-red-300";
  }
  return "border-red-200/70 bg-red-50/60 text-red-700 dark:border-red-500/15 dark:bg-red-500/10 dark:text-red-300";
}

export default function Backtest() {
  const { token } = useAuth();
  const { params: pipelineParams } = usePipelineParams();
  const [searchParams] = useSearchParams();
  const chart = useChartTheme();

  const initialForm = useMemo(
    () => ({
      top_n: Number(searchParams.get("top_n")) || pipelineParams.top_n || 20,
      lookback_days: Number(searchParams.get("lookback")) || pipelineParams.lookback_days || 252,
      skip_days: Number(searchParams.get("skip")) || pipelineParams.skip_days || 21,
      method:
        searchParams.get("method") ||
        (pipelineParams.method === "raw" ? "raw" : "vol_adjusted"),
      cost_bps: 20,
      start: "",
      end: "",
    }),
    [searchParams, pipelineParams]
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
              <div className="truncate text-emerald-700 dark:text-emerald-300">
                <span className="font-bold">+ Buy ({bought.length}):</span>{" "}
                {bought.map(shortSymbol).join(", ")}
              </div>
            )}
            {sold.length > 0 && (
              <div className="truncate text-red-700 dark:text-red-300">
                <span className="font-bold">− Sell ({sold.length}):</span>{" "}
                {sold.map(shortSymbol).join(", ")}
              </div>
            )}
            {bought.length === 0 && sold.length === 0 && (
              <span className="text-[var(--text-muted)]">No constituent changes (re-weighted)</span>
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
      <PageContainer>
        <GlassCard as="form" onSubmit={handleRun}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-12">
            <Input
              label="Top N"
              type="number"
              min={1}
              max={100}
              value={form.top_n}
              onChange={(e) => setForm((p) => ({ ...p, top_n: Number(e.target.value) }))}
              className="lg:col-span-1"
            />
            <Input
              label="Lookback"
              type="number"
              min={60}
              max={504}
              value={form.lookback_days}
              onChange={(e) =>
                setForm((p) => ({ ...p, lookback_days: Number(e.target.value) }))
              }
              className="lg:col-span-1"
            />
            <Input
              label="Skip Days"
              type="number"
              min={0}
              max={63}
              value={form.skip_days}
              onChange={(e) => setForm((p) => ({ ...p, skip_days: Number(e.target.value) }))}
              className="lg:col-span-1"
            />
            <Select
              label="Method"
              value={form.method}
              onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}
              className="sm:col-span-2 lg:col-span-2"
            >
              <option value="vol_adjusted">Vol-Adj</option>
              <option value="raw">Raw</option>
            </Select>
            <Input
              label="Cost (bps)"
              type="number"
              min={0}
              max={100}
              step={1}
              value={form.cost_bps}
              onChange={(e) => setForm((p) => ({ ...p, cost_bps: Number(e.target.value) }))}
              className="lg:col-span-1"
            />
            <Input
              label="Start (opt)"
              type="date"
              value={form.start}
              onChange={(e) => setForm((p) => ({ ...p, start: e.target.value }))}
              className="lg:col-span-2"
            />
            <Input
              label="End (opt)"
              type="date"
              value={form.end}
              onChange={(e) => setForm((p) => ({ ...p, end: e.target.value }))}
              className="lg:col-span-2"
            />
            <div className="col-span-2 flex items-end sm:col-span-4 lg:col-span-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={running}
                className="w-full"
              >
                <Play className="h-4 w-4" fill="currentColor" />
                {running ? "Running..." : "Run Backtest"}
              </Button>
            </div>
          </div>

          {savedRuns.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border-table)] pt-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
                <History className="h-3.5 w-3.5" />
                Saved Runs:
              </span>
              {savedRuns.slice(0, 6).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => loadRun(r.id)}
                  className={`rounded-full border px-3 py-1 font-medium transition ${
                    result?.id === r.id
                      ? "border-brand-plum/45 bg-brand-plum/15 text-brand-plum dark:border-brand-coral/50 dark:bg-brand-coral/15 dark:text-brand-coral"
                      : "lab-well text-[var(--text-secondary)] hover:border-brand-plum/40 dark:hover:border-brand-coral/50"
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
        </GlassCard>

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
            <GlassCard as="section">
              <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
                Equity Curve ({result.start_date} to {result.end_date})
              </h2>
              <p className="mb-4 text-xs text-[var(--text-muted)]">
                Rebased to {formatINR(result.params?.initial_capital || 1000000, 0)} starting capital
              </p>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={result.equity_curve}
                    margin={{ top: 8, right: 12, left: 6, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chart.colors.main} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chart.colors.main} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                    <XAxis
                      dataKey="date"
                      tick={chart.axisTick}
                      axisLine={chart.axisLine}
                      tickLine={false}
                      tickFormatter={(v) => v.slice(2, 7)}
                      minTickGap={35}
                    />
                    <YAxis
                      tick={chart.axisTick}
                      axisLine={chart.axisLine}
                      tickLine={false}
                      tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                      width={64}
                    />
                    <RechartsTooltip
                      contentStyle={chart.tooltipStyle}
                      labelStyle={chart.tooltipLabelStyle}
                      formatter={(val, name) => [formatINR(val, 0), name]}
                    />
                    <Legend wrapperStyle={chart.legendStyle} />
                    <Area
                      type="monotone"
                      dataKey="portfolio_value"
                      name="Momentum Strategy"
                      stroke={chart.colors.main}
                      strokeWidth={2.2}
                      fill="url(#eqFill)"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="benchmark_value"
                      name={result.benchmark?.name || "Benchmark"}
                      stroke={chart.colors.benchmark}
                      strokeWidth={1.75}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Drawdown + Yearly returns */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <GlassCard as="section">
                <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                  Strategy Drawdown
                </h3>
                <p className="mb-3 text-xs text-[var(--text-muted)]">
                  Peak {strat?.max_drawdown_peak_date} → Trough {strat?.max_drawdown_trough_date}
                </p>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={result.equity_curve}
                      margin={{ top: 4, right: 12, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chart.colors.negative} stopOpacity={0} />
                          <stop offset="95%" stopColor={chart.colors.negative} stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                      <XAxis
                        dataKey="date"
                        tick={chart.axisTickSm}
                        axisLine={chart.axisLine}
                        tickLine={false}
                        tickFormatter={(v) => v.slice(2, 7)}
                        minTickGap={35}
                      />
                      <YAxis
                        tick={chart.axisTickSm}
                        axisLine={chart.axisLine}
                        tickLine={false}
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                      />
                      <RechartsTooltip
                        contentStyle={chart.tooltipStyle}
                        labelStyle={chart.tooltipLabelStyle}
                        formatter={(val) => [`${(Number(val) * 100).toFixed(2)}%`, "Drawdown"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="drawdown"
                        stroke={chart.colors.negative}
                        fill="url(#ddFill)"
                        strokeWidth={1.75}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <GlassCard as="section">
                <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                  Yearly Returns Table
                </h3>
                <p className="mb-3 text-xs text-[var(--text-muted)]">
                  Calendar-year strategy vs {result.benchmark?.symbol}
                </p>
                <div className="overflow-x-auto rounded-xl border border-[var(--border-soft)]">
                  <table className="w-full border-collapse text-sm">
                    <thead className="lab-table-head">
                      <tr className="border-b border-[var(--border-table)] text-xs font-semibold uppercase text-[var(--text-muted)]">
                        <th className="px-3 py-2.5 text-left">Year</th>
                        <th className="px-3 py-2.5 text-right">Strategy</th>
                        <th className="px-3 py-2.5 text-right">Benchmark</th>
                        <th className="px-3 py-2.5 text-right">Excess</th>
                      </tr>
                    </thead>
                    <tbody className="lab-table-body divide-y divide-[var(--border-table)] tabular-nums">
                      {(result.yearly_returns || []).map((y) => (
                        <tr key={y.year} className="transition-colors hover:bg-[var(--surface-table-hover)]">
                          <td className="px-3 py-2.5 font-semibold text-[var(--text-primary)]">
                            {y.year}
                          </td>
                          <td
                            className={`px-3 py-2.5 text-right font-semibold ${
                              y.strategy_return >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {formatPct(y.strategy_return, 2)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-[var(--text-secondary)]">
                            {formatPct(y.benchmark_return, 2)}
                          </td>
                          <td
                            className={`px-3 py-2.5 text-right font-semibold ${
                              y.excess_return >= 0
                                ? "text-emerald-600 dark:text-emerald-300"
                                : "text-red-600 dark:text-red-300"
                            }`}
                          >
                            {formatPct(y.excess_return, 2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>

            {/* Monthly returns heatmap */}
            {monthlyHeatmapGrid.length > 0 && (
              <GlassCard as="section">
                <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                  Monthly Returns Heatmap (Strategy)
                </h3>
                <p className="mb-4 text-xs text-[var(--text-muted)]">
                  Calendar-month percentage returns across the backtest horizon
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[740px] border-separate border-spacing-1 text-center text-xs">
                    <thead>
                      <tr className="text-[var(--text-muted)]">
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
                          <td className="px-2 py-1.5 text-left font-bold text-[var(--text-primary)]">
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
              </GlassCard>
            )}

            {/* Rebalances log with Bought / Sold */}
            <section className="space-y-3">
              <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
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
            <GlassCard as="section" padding="p-5" className="relative overflow-hidden text-xs leading-relaxed text-[var(--text-secondary)]">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-brand-gold via-brand-coral to-brand-plum"
              />
              <div className="mb-2 flex items-center gap-2 pl-2 font-display text-sm font-bold text-brand-plum dark:text-brand-gold">
                <ShieldAlert className="h-4 w-4 text-brand-coral dark:text-brand-gold" />
                Simulation Limitations &amp; Disclaimer
              </div>
              <ul className="list-disc space-y-1 pl-7 text-[var(--text-secondary)]">
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
            </GlassCard>
          </div>
        )}
      </PageContainer>
    </AppLayout>
  );
}
