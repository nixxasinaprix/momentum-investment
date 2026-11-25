import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { History, Play, ShieldAlert } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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

export default function Backtest() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    top_n: Number(searchParams.get("top_n")) || 20,
    lookback_days: Number(searchParams.get("lookback")) || 252,
    skip_days: Number(searchParams.get("skip")) || 21,
    method: searchParams.get("method") || "vol_adjusted",
    cost_bps: 20,
    start: "",
    end: "",
  });

  const [result, setResult] = useState(null);
  const [savedRuns, setSavedRuns] = useState([]);
  const [running, setRunning] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    let active = true;

    api("/api/backtests", { token })
      .then(async (res) => {
        if (!active) return;
        const list = res.runs || [];
        setSavedRuns(list);
        if (list.length > 0) {
          const full = await api(`/api/backtests/${list[0].id}`, { token });
          if (active) setResult(full);
        }
      })
      .catch(() => {
        // Non-blocking; user can still run a fresh backtest
      })
      .finally(() => {
        if (active) setLoadingSaved(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleRun = async (e) => {
    e.preventDefault();
    setRunning(true);
    setError(null);
    try {
      const payload = {
        top_n: form.top_n,
        lookback_days: form.lookback_days,
        skip_days: form.skip_days,
        method: form.method,
        cost_bps: form.cost_bps,
        start: form.start || null,
        end: form.end || null,
      };
      const created = await api("/api/backtest", {
        method: "POST",
        body: payload,
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
        ...prev,
      ]);
    } catch (err) {
      setError(err.message || "Backtest failed");
    } finally {
      setRunning(false);
    }
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

  const strat = result?.metrics?.strategy;
  const bench = result?.metrics?.benchmark;

  const rebalanceCols = [
    { key: "signal_date", label: "Signal Date", sortable: true },
    { key: "executed_date", label: "Executed Close", sortable: true },
    {
      key: "selected_count",
      label: "Holdings",
      sortable: true,
      align: "right",
    },
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
      key: "selected_symbols",
      label: "Selected Symbols",
      sortable: false,
      render: (r) => (
        <span className="block max-w-[420px] truncate text-xs text-stone-300">
          {(r.selected_symbols || []).map(shortSymbol).join(", ")}
        </span>
      ),
    },
  ];

  return (
    <AppLayout
      title="Strategy Backtester"
      subtitle="Monthly-rebalanced simulation with T+1 close execution lag vs Nifty 200 (^CNX200)"
    >
      <div className="space-y-6">
        {/* Parameter form */}
        <form
          onSubmit={handleRun}
          className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
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
                onChange={(e) =>
                  setForm((p) => ({ ...p, skip_days: Number(e.target.value) }))
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
              />
            </label>
            <label className="text-xs text-stone-400">
              Method
              <select
                value={form.method}
                onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
              >
                <option value="vol_adjusted">Vol-Adjusted</option>
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
                onChange={(e) =>
                  setForm((p) => ({ ...p, cost_bps: Number(e.target.value) }))
                }
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
            {result.benchmark?.note && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                {result.benchmark.note}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Strategy CAGR"
                value={formatPct(strat?.cagr, 2)}
                subtext={`Benchmark (${result.benchmark?.symbol}): ${formatPct(bench?.cagr, 2)}`}
                accent="emerald"
              />
              <StatCard
                label="Sharpe Ratio"
                value={strat?.sharpe_ratio != null ? strat.sharpe_ratio.toFixed(3) : "—"}
                subtext={`Sortino ${strat?.sortino_ratio?.toFixed(2) ?? "—"} · Rf ${(
                  (result.metrics?.risk_free_rate ?? 0.065) * 100
                ).toFixed(1)}%`}
                accent="plum"
              />
              <StatCard
                label="Max Drawdown"
                value={formatPct(strat?.max_drawdown, 2)}
                subtext={`${strat?.max_drawdown_peak_date} → ${strat?.max_drawdown_trough_date} (Bench ${formatPct(
                  bench?.max_drawdown,
                  1
                )})`}
                accent="rose"
              />
              <StatCard
                label="Total Return"
                value={formatPct(strat?.total_return, 1)}
                subtext={`Turnover ${((strat?.avg_annual_turnover ?? 0) * 100).toFixed(
                  0
                )}%/yr · Costs ${strat?.total_cost_pct?.toFixed(2)}%`}
                accent="amber"
              />
            </div>

            {/* Equity curve */}
            <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold text-white">
                    Equity Curve ({result.start_date} to {result.end_date})
                  </h2>
                  <p className="text-xs text-stone-400">
                    Rebased to {formatINR(result.params?.initial_capital || 1000000, 0)} starting capital
                  </p>
                </div>
              </div>
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
                  Percentage decline from running equity peak
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
                  Calendar Year Returns
                </h3>
                <p className="mb-3 text-xs text-stone-400">
                  Strategy vs {result.benchmark?.symbol || "Benchmark"} annual performance
                </p>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(result.yearly_returns || []).map((y) => ({
                        year: String(y.year),
                        strategy: Number((y.strategy_return * 100).toFixed(2)),
                        benchmark: Number((y.benchmark_return * 100).toFixed(2)),
                      }))}
                      margin={{ top: 4, right: 12, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="year" tick={{ fill: "#a8a29e", fontSize: 11 }} />
                      <YAxis
                        tick={{ fill: "#a8a29e", fontSize: 11 }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#141220",
                          borderColor: "rgba(255,255,255,0.12)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        formatter={(val) => [`${val}%`]}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="strategy" name="Strategy" fill="#F0867C" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="benchmark" name="Benchmark" fill="#38bdf8" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            {/* Rebalances log */}
            <section className="space-y-3">
              <h3 className="font-display text-base font-bold text-white">
                Rebalance Log ({result.rebalances?.length || 0} monthly events)
              </h3>
              <DataTable
                columns={rebalanceCols}
                rows={result.rebalances || []}
                rowKey="executed_date"
                defaultSortKey="executed_date"
                defaultSortDir="desc"
                pageSize={12}
              />
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
