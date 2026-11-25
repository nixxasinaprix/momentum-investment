import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play, SlidersHorizontal } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppLayout from "../components/AppLayout";
import DataTable from "../components/DataTable";
import MathFormula from "../components/MathFormula";
import { SkeletonTable } from "../components/Skeleton";
import { ErrorState } from "../components/StateViews";
import { useCachedApi } from "../hooks/useCachedApi";
import { formatPct, shortSymbol } from "../lib/format";

export default function StrategyLab() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    as_of: "",
    method: "vol_adjusted",
    top: 20,
    lookback: 252,
    skip: 21,
  });
  const [applied, setApplied] = useState(form);

  const queryStr = useMemo(() => {
    const p = new URLSearchParams({
      method: applied.method,
      top: String(applied.top),
      lookback: String(applied.lookback),
      skip: String(applied.skip),
    });
    if (applied.as_of) p.set("as_of", applied.as_of);
    return `/api/signals?${p.toString()}`;
  }, [applied]);

  const { data, loading, error, refetch } = useCachedApi(queryStr);

  const selectedOnly = useMemo(
    () => (data?.signals || []).filter((s) => s.is_selected),
    [data]
  );

  const sectorBreakdown = useMemo(() => {
    const counts = {};
    selectedOnly.forEach((s) => {
      const sec = s.sector || "Other";
      counts[sec] = (counts[sec] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count);
  }, [selectedOnly]);

  const handleApply = (e) => {
    e.preventDefault();
    setApplied({ ...form });
  };

  const launchBacktest = () => {
    const p = new URLSearchParams({
      top_n: String(applied.top),
      lookback: String(applied.lookback),
      skip: String(applied.skip),
      method: applied.method,
    });
    navigate(`/backtest?${p.toString()}`);
  };

  const columns = [
    {
      key: "rank",
      label: "Rank",
      sortable: true,
      defaultDir: "asc",
      render: (r) => <span className="font-semibold text-stone-300">#{r.rank}</span>,
    },
    {
      key: "symbol",
      label: "Stock",
      sortable: true,
      defaultDir: "asc",
      render: (r) => (
        <div>
          <div className="font-semibold text-white">{shortSymbol(r.symbol)}</div>
          <div className="max-w-[210px] truncate text-xs text-stone-400">{r.name}</div>
        </div>
      ),
    },
    { key: "sector", label: "Sector", sortable: true, defaultDir: "asc" },
    {
      key: "momentum",
      label: "Return",
      sortable: true,
      align: "right",
      render: (r) => (
        <span className={r.momentum >= 0 ? "text-emerald-400" : "text-rose-400"}>
          {formatPct(r.momentum, 2)}
        </span>
      ),
    },
    {
      key: "volatility",
      label: "Volatility",
      sortable: true,
      align: "right",
      render: (r) => `${(r.volatility * 100).toFixed(2)}%`,
    },
    {
      key: "score",
      label: "Score",
      sortable: true,
      align: "right",
      render: (r) => <span className="font-bold text-[#F0867C]">{r.score.toFixed(3)}</span>,
    },
    {
      key: "is_selected",
      label: "Portfolio",
      sortable: true,
      render: (r) =>
        r.is_selected ? (
          <span className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
            Selected
          </span>
        ) : (
          <span className="text-xs text-stone-500">Reserve</span>
        ),
    },
  ];

  const formulaLatex =
    form.method === "vol_adjusted"
      ? `\\text{Score}_i = \\frac{P_{t-${form.skip}} / P_{t-${form.lookback}} - 1}{\\sigma_{${form.lookback}}(i)}`
      : `\\text{Score}_i = \\frac{P_{t-${form.skip}}}{P_{t-${form.lookback}}} - 1`;

  return (
    <AppLayout
      title="Strategy Lab"
      subtitle="Experiment with lookback, skip horizon, and volatility weighting on historical dates"
      actions={
        <button
          type="button"
          onClick={launchBacktest}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#8C4570] px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg transition hover:bg-[#7A3B61]"
        >
          Backtest This Config
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      }
    >
      <div className="space-y-6">
        <form
          onSubmit={handleApply}
          className="grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg lg:grid-cols-12"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5 lg:col-span-8">
            <label className="text-xs text-stone-400">
              As-Of Date (optional)
              <input
                type="date"
                value={form.as_of}
                onChange={(e) => setForm((p) => ({ ...p, as_of: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
              />
            </label>

            <label className="text-xs text-stone-400">
              Scoring Method
              <select
                value={form.method}
                onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
              >
                <option value="vol_adjusted">Vol-Adjusted</option>
                <option value="raw">Raw Momentum</option>
              </select>
            </label>

            <label className="text-xs text-stone-400">
              Top N ({form.top})
              <input
                type="number"
                min={1}
                max={100}
                value={form.top}
                onChange={(e) => setForm((p) => ({ ...p, top: Number(e.target.value) }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
              />
            </label>

            <label className="text-xs text-stone-400">
              Lookback Days
              <input
                type="number"
                min={60}
                max={504}
                value={form.lookback}
                onChange={(e) => setForm((p) => ({ ...p, lookback: Number(e.target.value) }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
              />
            </label>

            <label className="text-xs text-stone-400">
              Skip Days
              <input
                type="number"
                min={0}
                max={63}
                value={form.skip}
                onChange={(e) => setForm((p) => ({ ...p, skip: Number(e.target.value) }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
              />
            </label>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-xl border border-white/10 bg-[#07080F] p-3.5 lg:col-span-4">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#F0867C]" />
                Active Formula
              </span>
              {data?.as_of && <span>Used: {data.as_of}</span>}
            </div>
            <MathFormula display math={formulaLatex} />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8C4570] to-[#F0867C] px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
            >
              <Play className="h-3.5 w-3.5" fill="currentColor" />
              Compute Signals
            </button>
          </div>
        </form>

        {loading && !data ? (
          <SkeletonTable rows={10} cols={6} />
        ) : error ? (
          <ErrorState title="Signal computation failed" message={error} onRetry={refetch} />
        ) : (
          <div className="space-y-6">
            {sectorBreakdown.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
                <h2 className="font-display text-base font-bold text-white">
                  Sector Allocation of Top {selectedOnly.length} Selection
                </h2>
                <p className="mb-3 text-xs text-stone-400">
                  Equal-weight count across sectors as of {data?.as_of}
                </p>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectorBreakdown} margin={{ top: 4, right: 12, left: -12, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="sector"
                        tick={{ fill: "#a8a29e", fontSize: 10 }}
                        interval={0}
                        angle={-18}
                        textAnchor="end"
                        height={54}
                      />
                      <YAxis allowDecimals={false} tick={{ fill: "#a8a29e", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#141220",
                          borderColor: "rgba(255,255,255,0.12)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="count" name="Selected Stocks" fill="#F0867C" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            <DataTable
              columns={columns}
              rows={data?.signals || []}
              defaultSortKey="rank"
              defaultSortDir="asc"
              pageSize={25}
              onRowClick={(r) => navigate(`/stock/${encodeURIComponent(r.symbol)}`)}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
