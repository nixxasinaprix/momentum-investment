import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, GitCompare, RotateCcw, SlidersHorizontal } from "lucide-react";
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
import { EmptyState, ErrorState } from "../components/StateViews";
import { useCachedApi } from "../hooks/useCachedApi";
import { formatPct, shortSymbol } from "../lib/format";

const DEFAULTS = {
  lookback: 252,
  skip: 21,
  top: 20,
  method: "vol_adjusted",
};

export default function StrategyLab() {
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULTS);
  const [debounced, setDebounced] = useState(DEFAULTS);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(form);
    }, 250);
    return () => clearTimeout(timer);
  }, [form]);

  const queryStr = useMemo(() => {
    const safeSkip = Math.min(debounced.skip, debounced.lookback - 1);
    const p = new URLSearchParams({
      method: debounced.method,
      top: String(debounced.top),
      lookback: String(debounced.lookback),
      skip: String(safeSkip),
    });
    return `/api/strategy/preview?${p.toString()}`;
  }, [debounced]);

  const { data, loading, error, refetch } = useCachedApi(queryStr);

  const diffsFromDefault = useMemo(() => {
    const diffs = [];
    if (form.lookback !== DEFAULTS.lookback) {
      diffs.push(`Lookback ${DEFAULTS.lookback}d → ${form.lookback}d`);
    }
    if (form.skip !== DEFAULTS.skip) {
      diffs.push(`Skip ${DEFAULTS.skip}d → ${form.skip}d`);
    }
    if (form.top !== DEFAULTS.top) {
      diffs.push(`Holdings ${DEFAULTS.top} → ${form.top}`);
    }
    if (form.method !== DEFAULTS.method) {
      diffs.push(
        `Scoring ${DEFAULTS.method} → ${form.method}`
      );
    }
    return diffs;
  }, [form]);

  const launchBacktest = () => {
    const safeSkip = Math.min(form.skip, form.lookback - 1);
    const p = new URLSearchParams({
      top_n: String(form.top),
      lookback: String(form.lookback),
      skip: String(safeSkip),
      method: form.method,
      autorun: "1",
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
        <div className="flex items-center gap-2">
          <div>
            <div className="font-semibold text-white">{shortSymbol(r.symbol)}</div>
            <div className="max-w-[200px] truncate text-xs text-stone-400">{r.name}</div>
          </div>
          {!r.in_default && (
            <span className="rounded-md border border-emerald-500/35 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
              NEW
            </span>
          )}
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
        <span className={(r.momentum ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}>
          {formatPct(r.momentum, 2)}
        </span>
      ),
    },
    {
      key: "volatility",
      label: "Vol (Ann)",
      sortable: true,
      align: "right",
      render: (r) => (r.volatility != null ? `${(r.volatility * 100).toFixed(2)}%` : "—"),
    },
    {
      key: "score",
      label: "Score",
      sortable: true,
      align: "right",
      render: (r) => (
        <span className="font-bold text-[#F0867C]">
          {r.score != null ? r.score.toFixed(3) : "—"}
        </span>
      ),
    },
    {
      key: "weight",
      label: "Weight",
      sortable: true,
      align: "right",
      render: (r) => `${(r.weight * 100).toFixed(2)}%`,
    },
  ];

  const effectiveSkip = Math.min(form.skip, form.lookback - 1);
  const formulaLatex =
    form.method === "vol_adjusted"
      ? `\\text{Score}_i = \\frac{\\frac{P_{t-${effectiveSkip}}}{P_{t-${form.lookback}}} - 1}{\\sigma_{\\text{ann}, ${form.lookback}}(i)}, \\qquad w_i = \\frac{1}{${form.top}} = ${(
          100 / form.top
        ).toFixed(2)}\\%`
      : `\\text{Score}_i = \\frac{P_{t-${effectiveSkip}}}{P_{t-${form.lookback}}} - 1, \\qquad w_i = \\frac{1}{${form.top}} = ${(
          100 / form.top
        ).toFixed(2)}\\%`;

  const comp = data?.comparison_to_default;

  return (
    <AppLayout
      title="Strategy Lab"
      subtitle="Interactive live signal tuner with debounced updates across lookback, skip, and portfolio size"
      actions={
        <div className="flex items-center gap-2">
          {diffsFromDefault.length > 0 && (
            <button
              type="button"
              onClick={() => setForm(DEFAULTS)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-stone-200 hover:border-white/30"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={launchBacktest}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#8C4570] to-[#F0867C] px-3.5 py-1.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110"
          >
            Run backtest with these settings
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Sliders + live KaTeX formula */}
        <section className="grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg lg:grid-cols-12">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
            <div className="rounded-xl border border-white/10 bg-[#07080F] p-3.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-stone-300">Lookback Horizon</span>
                <span className="font-bold text-[#F0867C]">{form.lookback} trading days</span>
              </div>
              <input
                type="range"
                min={60}
                max={504}
                step={1}
                value={form.lookback}
                onChange={(e) => {
                  const lb = Number(e.target.value);
                  setForm((p) => ({ ...p, lookback: lb, skip: Math.min(p.skip, lb - 1) }));
                }}
                className="mt-2 h-1.5 w-full cursor-pointer accent-[#F0867C]"
              />
              <div className="mt-1 flex justify-between text-[10px] text-stone-500">
                <span>60d (~3M)</span>
                <span>252d (1Y)</span>
                <span>504d (2Y)</span>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#07080F] p-3.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-stone-300">Skip Recent Days</span>
                <span className="font-bold text-[#F0867C]">{effectiveSkip} trading days</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.min(63, form.lookback - 1)}
                step={1}
                value={effectiveSkip}
                onChange={(e) => setForm((p) => ({ ...p, skip: Number(e.target.value) }))}
                className="mt-2 h-1.5 w-full cursor-pointer accent-[#F0867C]"
              />
              <div className="mt-1 flex justify-between text-[10px] text-stone-500">
                <span>0d (no skip)</span>
                <span>21d (1M)</span>
                <span>63d (3M)</span>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#07080F] p-3.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-stone-300">Portfolio Top N</span>
                <span className="font-bold text-[#F0867C]">{form.top} stocks</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={1}
                value={form.top}
                onChange={(e) => setForm((p) => ({ ...p, top: Number(e.target.value) }))}
                className="mt-2 h-1.5 w-full cursor-pointer accent-[#F0867C]"
              />
              <div className="mt-1 flex justify-between text-[10px] text-stone-500">
                <span>5 (Concentrated)</span>
                <span>20 (Default)</span>
                <span>50 (Broad)</span>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#07080F] p-3.5">
              <span className="text-xs font-medium text-stone-300">Scoring Method</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { id: "vol_adjusted", label: "Vol-Adjusted" },
                  { id: "raw", label: "Raw Momentum" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, method: opt.id }))}
                    className={`rounded-lg border py-2 text-xs font-semibold transition ${
                      form.method === opt.id
                        ? "border-[#F0867C]/50 bg-[#8C4570]/45 text-white"
                        : "border-white/10 bg-white/[0.03] text-stone-400 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live KaTeX formula + What changed vs defaults */}
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-white/10 bg-[#07080F] p-4 lg:col-span-5">
            <div>
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#F0867C]">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Live Signal Formula
                </span>
                {data?.as_of && <span>As of {data.as_of}</span>}
              </div>
              <div className="mt-2">
                <MathFormula display math={formulaLatex} />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <GitCompare className="h-3.5 w-3.5 text-amber-300" />
                What Changed vs Defaults (252 / 21 / Top 20 / Vol-Adj)
              </div>
              {diffsFromDefault.length === 0 ? (
                <p className="mt-1 text-stone-400">
                  Using canonical baseline parameters ({data?.universe_size || "—"} eligible stocks).
                </p>
              ) : (
                <div className="mt-1.5 space-y-1 text-stone-300">
                  <p>{diffsFromDefault.join(" · ")}</p>
                  {comp && (
                    <p className="text-stone-400">
                      Overlap with default Top 20:{" "}
                      <strong className="text-white">{comp.overlap_count}</strong> stocks
                      {comp.added.length > 0 && (
                        <>
                          {" "}· Added:{" "}
                          <span className="text-emerald-300">
                            {comp.added.slice(0, 5).map(shortSymbol).join(", ")}
                            {comp.added.length > 5 ? ` +${comp.added.length - 5}` : ""}
                          </span>
                        </>
                      )}
                      {comp.removed.length > 0 && (
                        <>
                          {" "}· Dropped:{" "}
                          <span className="text-rose-300">
                            {comp.removed.slice(0, 5).map(shortSymbol).join(", ")}
                            {comp.removed.length > 5 ? ` +${comp.removed.length - 5}` : ""}
                          </span>
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {loading && !data ? (
          <SkeletonTable rows={10} cols={7} />
        ) : error ? (
          <ErrorState title="Could not preview strategy" message={error} onRetry={refetch} />
        ) : !data?.portfolio?.length ? (
          <EmptyState
            title="No eligible stocks"
            description="Try shortening the lookback window so more stocks meet the minimum history rule."
          />
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold text-white">
                    Sector Allocation ({data.portfolio.length} Selected Holdings)
                  </h2>
                  <p className="text-xs text-stone-400">
                    Equal weight {(100 / data.portfolio.length).toFixed(2)}% per position · Universe: {data.universe_size} eligible stocks
                  </p>
                </div>
                {loading && (
                  <span className="text-xs font-medium text-[#F0867C]">Updating preview...</span>
                )}
              </div>

              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.sectors}
                    margin={{ top: 4, right: 12, left: -12, bottom: 24 }}
                  >
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
                    <Bar dataKey="count" name="Holdings" fill="#F0867C" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <DataTable
              columns={columns}
              rows={data.portfolio}
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
