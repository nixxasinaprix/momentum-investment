import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, X } from "lucide-react";
import {
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
import { SkeletonChart, SkeletonTable } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/StateViews";
import TrendBadge from "../components/TrendBadge";
import { useAuth } from "../context/AuthContext";
import { useCachedApi } from "../hooks/useCachedApi";
import { api } from "../lib/api";
import { formatINR, formatPct, shortSymbol } from "../lib/format";

const LINE_COLORS = ["#F0867C", "#34d399", "#38bdf8", "#fbbf24"];

export default function Compare() {
  const { token } = useAuth();
  const { data: screener, loading: screenerLoading, error: screenerError, refetch } =
    useCachedApi("/api/screener");

  const [customSelected, setCustomSelected] = useState(null);
  const [range, setRange] = useState("1y");
  const [pickerVal, setPickerVal] = useState("");
  const [analysisState, setAnalysisState] = useState({
    fetchKey: null,
    items: {},
    error: null,
  });

  const allStocks = useMemo(() => screener?.stocks || [], [screener]);
  const selected = useMemo(() => {
    if (customSelected !== null) return customSelected;
    return allStocks.length >= 2 ? [allStocks[0].symbol, allStocks[1].symbol] : [];
  }, [customSelected, allStocks]);

  const fetchKey = selected.length && token ? `${range}:${selected.join(",")}` : null;

  useEffect(() => {
    if (!fetchKey) return;
    let active = true;

    Promise.all(
      selected.map((sym) =>
        api(`/api/stocks/${encodeURIComponent(sym)}/analysis?range=${range}`, { token })
      )
    )
      .then((results) => {
        if (!active) return;
        const map = {};
        results.forEach((res) => {
          map[res.stock.symbol] = res;
        });
        setAnalysisState({ fetchKey, items: map, error: null });
      })
      .catch((err) => {
        if (active) {
          setAnalysisState({
            fetchKey,
            items: {},
            error: err.message || "Failed to compare stocks",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [fetchKey, selected, range, token]);

  const analyses = analysisState.items;
  const loadingAnalyses = Boolean(fetchKey) && analysisState.fetchKey !== fetchKey;
  const analysisError = analysisState.fetchKey === fetchKey ? analysisState.error : null;

  const addSymbol = (sym) => {
    if (!sym || selected.includes(sym) || selected.length >= 4) return;
    setCustomSelected([...selected, sym]);
    setPickerVal("");
  };

  const removeSymbol = (sym) => {
    setCustomSelected(selected.filter((s) => s !== sym));
  };

  const normalizedChart = useMemo(() => {
    const activeItems = selected.map((s) => analyses[s]).filter(Boolean);
    if (!activeItems.length) return [];

    const byDate = new Map();
    activeItems.forEach((item) => {
      const sym = item.stock.symbol;
      const pts = item.series || [];
      const firstValid = pts.find((p) => p.close != null && p.close > 0);
      if (!firstValid) return;
      const base = firstValid.close;
      pts.forEach((p) => {
        if (p.close == null) return;
        if (!byDate.has(p.date)) byDate.set(p.date, { date: p.date });
        byDate.get(p.date)[sym] = Number(((p.close / base) * 100).toFixed(2));
      });
    });

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [analyses, selected]);

  return (
    <AppLayout
      title="Compare Stocks"
      subtitle="Side-by-side normalized performance and quantitative metrics for up to 4 stocks"
    >
      {screenerLoading && !screener ? (
        <div className="space-y-6">
          <SkeletonChart height={320} />
          <SkeletonTable rows={5} cols={5} />
        </div>
      ) : screenerError && !screener ? (
        <ErrorState title="Could not load universe" message={screenerError} onRetry={refetch} />
      ) : (
        <div className="space-y-6">
          {/* Selector bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#12131F]/90 p-4 shadow-lg">
            <div className="flex flex-wrap items-center gap-2">
              {selected.map((sym, idx) => (
                <span
                  key={sym}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: LINE_COLORS[idx % LINE_COLORS.length] }}
                  />
                  {shortSymbol(sym)}
                  <button
                    type="button"
                    onClick={() => removeSymbol(sym)}
                    className="text-stone-400 hover:text-white"
                    aria-label={`Remove ${sym}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}

              {selected.length < 4 && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={pickerVal}
                    onChange={(e) => addSymbol(e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#07080F] px-3 py-1.5 text-xs text-white focus:border-[#F0867C] focus:outline-none"
                  >
                    <option value="">+ Add stock ({selected.length}/4)</option>
                    {allStocks
                      .filter((s) => !selected.includes(s.symbol))
                      .map((s) => (
                        <option key={s.symbol} value={s.symbol}>
                          {shortSymbol(s.symbol)} — {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex rounded-xl border border-white/10 bg-[#07080F] p-0.5">
              {["1y", "3y", "5y"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase transition ${
                    range === r ? "bg-[#8C4570] text-white" : "text-stone-400 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {!selected.length ? (
            <EmptyState
              icon={Plus}
              title="Select stocks to compare"
              description="Choose 2 to 4 Nifty 200 stocks above to compare their normalized performance and momentum metrics."
            />
          ) : analysisError ? (
            <ErrorState title="Comparison failed" message={analysisError} />
          ) : loadingAnalyses && !normalizedChart.length ? (
            <SkeletonChart height={340} />
          ) : (
            <>
              <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
                <h2 className="font-display text-base font-bold text-white">
                  Normalized Price Performance (Base = 100)
                </h2>
                <p className="mb-4 text-xs text-stone-400">
                  Cumulative growth from the start of the {range.toUpperCase()} window
                </p>
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={normalizedChart} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#a8a29e", fontSize: 11 }}
                        tickFormatter={(v) => v.slice(2, 7)}
                        minTickGap={30}
                      />
                      <YAxis tick={{ fill: "#a8a29e", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#141220",
                          borderColor: "rgba(255,255,255,0.12)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      {selected.map((sym, idx) => (
                        <Line
                          key={sym}
                          type="monotone"
                          dataKey={sym}
                          name={shortSymbol(sym)}
                          stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#12131F]/90 shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-stone-400">
                        <th className="px-4 py-3.5">Metric</th>
                        {selected.map((sym) => (
                          <th key={sym} className="px-4 py-3.5 text-right">
                            <Link
                              to={`/stock/${encodeURIComponent(sym)}`}
                              className="text-white hover:text-[#F0867C]"
                            >
                              {shortSymbol(sym)}
                            </Link>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {[
                        {
                          label: "Last Price",
                          render: (a) => formatINR(a.summary.last_price),
                        },
                        {
                          label: "Universe Rank",
                          render: (a) => (a.summary.rank ? `#${a.summary.rank}` : "—"),
                        },
                        {
                          label: "Momentum Score",
                          render: (a) =>
                            a.summary.score != null ? a.summary.score.toFixed(3) : "—",
                        },
                        {
                          label: "12-1M Return",
                          render: (a) => formatPct(a.summary.ret_12_1m, 2),
                        },
                        {
                          label: "6M Return",
                          render: (a) => formatPct(a.summary.ret_6m, 2),
                        },
                        {
                          label: "3M Return",
                          render: (a) => formatPct(a.summary.ret_3m, 2),
                        },
                        {
                          label: "1M Return",
                          render: (a) => formatPct(a.summary.ret_1m, 2),
                        },
                        {
                          label: "Annualised Vol",
                          render: (a) =>
                            a.summary.volatility != null
                              ? `${(a.summary.volatility * 100).toFixed(2)}%`
                              : "—",
                        },
                        {
                          label: "RSI(14)",
                          render: (a) =>
                            a.summary.rsi_14 != null ? a.summary.rsi_14.toFixed(1) : "—",
                        },
                        {
                          label: "% Below 52W High",
                          render: (a) =>
                            a.summary.pct_below_52w_high != null
                              ? `-${a.summary.pct_below_52w_high.toFixed(1)}%`
                              : "—",
                        },
                        {
                          label: "Trend",
                          render: (a) => <TrendBadge trend={a.summary.trend} />,
                        },
                      ].map((row) => (
                        <tr key={row.label} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-medium text-stone-400">
                            {row.label}
                          </td>
                          {selected.map((sym) => {
                            const item = analyses[sym];
                            return (
                              <td key={sym} className="px-4 py-3 text-right tabular-nums text-white">
                                {item ? row.render(item) : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </AppLayout>
  );
}
