import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, X } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppLayout from "../components/AppLayout";
import {
  DisclaimerBanner,
  EmptyState,
  ErrorState,
  GlassCard,
  PageContainer,
  SegmentedControl,
  Select,
  SkeletonChart,
  SkeletonTable,
  TrendBadge,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useCachedApi } from "../hooks/useCachedApi";
import { api } from "../lib/api";
import { useChartTheme } from "../lib/chartTheme";
import { formatINR, formatPct, shortSymbol } from "../lib/format";

const RANGES = [
  { value: "1y", label: "1Y" },
  { value: "3y", label: "3Y" },
  { value: "5y", label: "5Y" },
];

export default function Compare() {
  const { token } = useAuth();
  const chart = useChartTheme();
  const lineColors = chart.colors.series;

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

  const { normalizedChart, rsChart } = useMemo(() => {
    const activeItems = selected.map((s) => analyses[s]).filter(Boolean);
    if (!activeItems.length) return { normalizedChart: [], rsChart: [] };

    const normByDate = new Map();
    const rsByDate = new Map();

    activeItems.forEach((item) => {
      const sym = item.stock.symbol;
      const pts = item.series || [];
      const firstValid = pts.find((p) => p.close != null && p.close > 0);
      if (!firstValid) return;
      const base = firstValid.close;
      pts.forEach((p) => {
        if (p.close != null) {
          if (!normByDate.has(p.date)) normByDate.set(p.date, { date: p.date });
          normByDate.get(p.date)[sym] = Number(((p.close / base) * 100).toFixed(2));
        }
        if (p.relative_strength != null) {
          if (!rsByDate.has(p.date)) rsByDate.set(p.date, { date: p.date });
          rsByDate.get(p.date)[sym] = Number(p.relative_strength.toFixed(2));
        }
      });
    });

    return {
      normalizedChart: Array.from(normByDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
      rsChart: Array.from(rsByDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }, [analyses, selected]);

  const metricRows = [
    {
      label: "Last Price",
      bestMode: null,
      val: (a) => a.summary.last_price,
      render: (a) => formatINR(a.summary.last_price),
    },
    {
      label: "Universe Rank",
      bestMode: "min",
      val: (a) => a.summary.rank,
      render: (a) => (a.summary.rank ? `#${a.summary.rank}` : "—"),
    },
    {
      label: "Momentum Score",
      bestMode: "max",
      val: (a) => a.summary.score,
      render: (a) => (a.summary.score != null ? a.summary.score.toFixed(3) : "—"),
    },
    {
      label: "12-1M Return",
      bestMode: "max",
      val: (a) => a.summary.ret_12_1m,
      render: (a) => formatPct(a.summary.ret_12_1m, 2),
    },
    {
      label: "6M Return",
      bestMode: "max",
      val: (a) => a.summary.ret_6m,
      render: (a) => formatPct(a.summary.ret_6m, 2),
    },
    {
      label: "3M Return",
      bestMode: "max",
      val: (a) => a.summary.ret_3m,
      render: (a) => formatPct(a.summary.ret_3m, 2),
    },
    {
      label: "1M Return",
      bestMode: "max",
      val: (a) => a.summary.ret_1m,
      render: (a) => formatPct(a.summary.ret_1m, 2),
    },
    {
      label: "Annualised Vol (Lower Better)",
      bestMode: "min",
      val: (a) => a.summary.volatility,
      render: (a) =>
        a.summary.volatility != null ? `${(a.summary.volatility * 100).toFixed(2)}%` : "—",
    },
    {
      label: "RSI(14)",
      bestMode: null,
      val: (a) => a.summary.rsi_14,
      render: (a) => (a.summary.rsi_14 != null ? a.summary.rsi_14.toFixed(1) : "—"),
    },
    {
      label: "% Below 52W High (Closest)",
      bestMode: "min",
      val: (a) => a.summary.pct_below_52w_high,
      render: (a) =>
        a.summary.pct_below_52w_high != null
          ? `-${a.summary.pct_below_52w_high.toFixed(1)}%`
          : "—",
    },
    {
      label: "Trend",
      bestMode: null,
      val: () => null,
      render: (a) => <TrendBadge trend={a.summary.trend} />,
    },
  ];

  return (
    <AppLayout
      title="Compare Stocks"
      subtitle="Rebased performance, relative strength vs Nifty 200, and side-by-side metrics for 2–4 stocks"
    >
      {screenerLoading && !screener ? (
        <PageContainer>
          <SkeletonChart height={320} />
          <SkeletonTable rows={5} cols={5} />
        </PageContainer>
      ) : screenerError && !screener ? (
        <ErrorState
          title="Could not load universe"
          message={screenerError}
          onRetry={refetch}
        />
      ) : (
        <PageContainer>
          <DisclaimerBanner />

          <GlassCard padding="p-4" className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {selected.map((sym, idx) => (
                <span
                  key={sym}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-surface-cream/90 px-3 py-1.5 text-xs font-semibold text-stone-900 dark:border-stone-700 dark:bg-stone-800/85 dark:text-stone-100"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: lineColors[idx % lineColors.length] }}
                  />
                  {shortSymbol(sym)}
                  <button
                    type="button"
                    onClick={() => removeSymbol(sym)}
                    className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-brand-coral"
                    aria-label={`Remove ${sym}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}

              {selected.length < 4 && (
                <Select
                  aria-label="Add stock to compare"
                  value={pickerVal}
                  onChange={(e) => addSymbol(e.target.value)}
                  className="w-56"
                  selectClassName="py-1.5 text-xs"
                >
                  <option value="">+ Add stock ({selected.length}/4)</option>
                  {allStocks
                    .filter((s) => !selected.includes(s.symbol))
                    .map((s) => (
                      <option key={s.symbol} value={s.symbol}>
                        {shortSymbol(s.symbol)} — {s.name}
                      </option>
                    ))}
                </Select>
              )}
            </div>

            <SegmentedControl
              size="xs"
              value={range}
              onChange={setRange}
              options={RANGES}
            />
          </GlassCard>

          {selected.length < 2 ? (
            <EmptyState
              icon={Plus}
              title="Pick 2 to 4 stocks to compare"
              description="Use the selector above to add at least 2 Nifty 200 stocks."
            />
          ) : analysisError ? (
            <ErrorState title="Comparison failed" message={analysisError} />
          ) : loadingAnalyses && !normalizedChart.length ? (
            <SkeletonChart height={340} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <GlassCard as="section">
                  <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                    Normalized Performance (Base = 100)
                  </h2>
                  <p className="mb-4 text-xs text-stone-600 dark:text-stone-400">
                    Cumulative return over the {range.toUpperCase()} window
                  </p>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={normalizedChart}
                        margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                        <XAxis
                          dataKey="date"
                          tick={chart.axisTick}
                          axisLine={chart.axisLine}
                          tickLine={false}
                          tickFormatter={(v) => v.slice(2, 7)}
                          minTickGap={30}
                        />
                        <YAxis
                          tick={chart.axisTick}
                          axisLine={chart.axisLine}
                          tickLine={false}
                        />
                        <ReferenceLine
                          y={100}
                          stroke={chart.referenceLine}
                          strokeDasharray="4 4"
                        />
                        <Tooltip
                          contentStyle={chart.tooltipStyle}
                          labelStyle={chart.tooltipLabelStyle}
                        />
                        <Legend wrapperStyle={chart.legendStyle} />
                        {selected.map((sym, idx) => (
                          <Line
                            key={sym}
                            type="monotone"
                            dataKey={sym}
                            name={shortSymbol(sym)}
                            stroke={lineColors[idx % lineColors.length]}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>

                <GlassCard as="section">
                  <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                    Relative Strength vs Nifty 200 (Base = 100)
                  </h2>
                  <p className="mb-4 text-xs text-stone-600 dark:text-stone-400">
                    Rising line indicates outperformance relative to the ^CNX200 benchmark
                  </p>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={rsChart}
                        margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                        <XAxis
                          dataKey="date"
                          tick={chart.axisTick}
                          axisLine={chart.axisLine}
                          tickLine={false}
                          tickFormatter={(v) => v.slice(2, 7)}
                          minTickGap={30}
                        />
                        <YAxis
                          tick={chart.axisTick}
                          axisLine={chart.axisLine}
                          tickLine={false}
                        />
                        <ReferenceLine
                          y={100}
                          stroke={chart.referenceLine}
                          strokeDasharray="4 4"
                        />
                        <Tooltip
                          contentStyle={chart.tooltipStyle}
                          labelStyle={chart.tooltipLabelStyle}
                        />
                        <Legend wrapperStyle={chart.legendStyle} />
                        {selected.map((sym, idx) => (
                          <Line
                            key={sym}
                            type="monotone"
                            dataKey={sym}
                            name={shortSymbol(sym)}
                            stroke={lineColors[idx % lineColors.length]}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>

              <GlassCard as="section" padding="p-0" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                    <thead className="bg-stone-100/80 dark:bg-stone-800/50">
                      <tr className="border-b border-stone-200/90 text-xs font-semibold uppercase tracking-wider text-stone-600 dark:border-stone-800 dark:text-stone-400">
                        <th className="px-4 py-3.5">Metric (Best Highlighted)</th>
                        {selected.map((sym, idx) => (
                          <th key={sym} className="px-4 py-3.5 text-right">
                            <Link
                              to={`/stock/${encodeURIComponent(sym)}`}
                              className="inline-flex items-center gap-1.5 text-stone-900 hover:text-brand-plum dark:text-stone-100 dark:hover:text-brand-coral"
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: lineColors[idx % lineColors.length] }}
                              />
                              {shortSymbol(sym)}
                            </Link>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200/70 dark:divide-stone-800/80">
                      {metricRows.map((row) => {
                        const vals = selected
                          .map((sym) => ({
                            sym,
                            num: analyses[sym] ? row.val(analyses[sym]) : null,
                          }))
                          .filter(
                            (x) =>
                              x.num !== null &&
                              x.num !== undefined &&
                              !Number.isNaN(x.num)
                          );

                        let bestVal = null;
                        if (row.bestMode && vals.length > 0) {
                          bestVal =
                            row.bestMode === "max"
                              ? Math.max(...vals.map((v) => v.num))
                              : Math.min(...vals.map((v) => v.num));
                        }

                        return (
                          <tr
                            key={row.label}
                            className="transition-colors hover:bg-stone-100/60 dark:hover:bg-stone-800/40"
                          >
                            <td className="px-4 py-3 font-medium text-stone-600 dark:text-stone-400">
                              {row.label}
                            </td>
                            {selected.map((sym) => {
                              const item = analyses[sym];
                              const rawVal = item ? row.val(item) : null;
                              const isBest =
                                bestVal !== null &&
                                rawVal !== null &&
                                rawVal !== undefined &&
                                rawVal === bestVal;

                              return (
                                <td
                                  key={sym}
                                  className="px-4 py-3 text-right tabular-nums text-stone-900 dark:text-stone-100"
                                >
                                  {item ? (
                                    <span
                                      className={
                                        isBest
                                          ? "inline-block rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300"
                                          : ""
                                      }
                                    >
                                      {row.render(item)}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </>
          )}
        </PageContainer>
      )}
    </AppLayout>
  );
}
