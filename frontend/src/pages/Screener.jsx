import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Columns, Download, Search, SlidersHorizontal, Star, X } from "lucide-react";
import AppLayout from "../components/AppLayout";
import DataTable from "../components/DataTable";
import Sparkline from "../components/Sparkline";
import { SkeletonTable } from "../components/Skeleton";
import { ErrorState } from "../components/StateViews";
import TrendBadge from "../components/TrendBadge";
import { usePipelineParams } from "../context/PipelineContext";
import { useCachedApi } from "../hooks/useCachedApi";
import { useWatchlist } from "../hooks/useWatchlist";
import { exportRowsToCsv, formatINR, formatPct, shortSymbol } from "../lib/format";

const OPTIONAL_COLUMNS = [
  { key: "market_cap_cr", label: "Market Cap", defaultVisible: true },
  { key: "ret_1m", label: "1M Return", defaultVisible: true },
  { key: "ret_3m", label: "3M Return", defaultVisible: true },
  { key: "ret_6m", label: "6M Return", defaultVisible: true },
  { key: "ret_12_1m", label: "12-1M Return", defaultVisible: true },
  { key: "volatility", label: "Volatility", defaultVisible: true },
  { key: "pct_below_52w_high", label: "% Below 52W High", defaultVisible: true },
  { key: "rsi_14", label: "RSI(14)", defaultVisible: false },
  { key: "sparkline", label: "30D Trend", defaultVisible: true },
];

const TREND_OPTIONS = [
  "All",
  "Strong uptrend",
  "Pullback",
  "Weakening",
  "Downtrend",
  "Insufficient data",
];

function ReturnCell({ value }) {
  if (value === null || value === undefined) {
    return <span className="text-stone-500">—</span>;
  }
  const cls = value >= 0 ? "text-emerald-400" : "text-rose-400";
  return <span className={`font-medium ${cls}`}>{formatPct(value, 1)}</span>;
}

export default function Screener() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { params: pipelineParams } = usePipelineParams();
  const { data, loading, error, refetch } = useCachedApi("/api/screener");
  const { isWatched, toggleWatchlist } = useWatchlist();

  const [query, setQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState(() => searchParams.get("sector") || "All");
  const [trendFilter, setTrendFilter] = useState("All");
  const [minScore, setMinScore] = useState(-3);
  const [showColMenu, setShowColMenu] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Object.fromEntries(OPTIONAL_COLUMNS.map((c) => [c.key, c.defaultVisible]))
  );

  const stocks = useMemo(() => data?.stocks || [], [data]);

  const sectors = useMemo(() => {
    const unique = Array.from(new Set(stocks.map((s) => s.sector).filter(Boolean))).sort();
    return ["All", ...unique];
  }, [stocks]);

  const scoreBounds = useMemo(() => {
    const scores = stocks.map((s) => s.score).filter((v) => v !== null && v !== undefined);
    if (!scores.length) return { min: -3, max: 3 };
    return {
      min: Math.floor(Math.min(...scores) * 10) / 10,
      max: Math.ceil(Math.max(...scores) * 10) / 10,
    };
  }, [stocks]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stocks.filter((row) => {
      if (q) {
        const hay = `${row.symbol} ${row.name} ${row.sector}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (sectorFilter !== "All" && row.sector !== sectorFilter) return false;
      if (trendFilter !== "All" && row.trend !== trendFilter) return false;
      if (minScore > scoreBounds.min) {
        if (row.score === null || row.score === undefined || row.score < minScore) {
          return false;
        }
      }
      return true;
    });
  }, [stocks, query, sectorFilter, trendFilter, minScore, scoreBounds.min]);

  const handleSectorChange = (value) => {
    setSectorFilter(value);
    if (value === "All") {
      searchParams.delete("sector");
    } else {
      searchParams.set("sector", value);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const resetFilters = () => {
    setQuery("");
    handleSectorChange("All");
    setTrendFilter("All");
    setMinScore(scoreBounds.min);
  };

  const columns = useMemo(() => {
    const base = [
      {
        key: "watch",
        label: "",
        sortable: false,
        render: (row) => {
          const watched = isWatched(row.symbol);
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleWatchlist(row.symbol);
              }}
              aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
              className={`rounded-lg p-1 transition ${
                watched
                  ? "text-amber-400 hover:bg-amber-400/15"
                  : "text-stone-600 hover:bg-white/10 hover:text-stone-300"
              }`}
            >
              <Star className="h-4 w-4" fill={watched ? "currentColor" : "none"} />
            </button>
          );
        },
      },
      {
        key: "rank",
        label: "Rank",
        sortable: true,
        defaultDir: "asc",
        render: (row) => (
          <span className="font-semibold tabular-nums text-stone-300">
            {row.rank !== null ? `#${row.rank}` : "—"}
          </span>
        ),
      },
      {
        key: "symbol",
        label: "Stock",
        sortable: true,
        defaultDir: "asc",
        render: (row) => (
          <div className="min-w-[140px]">
            <div className="font-semibold text-white">{shortSymbol(row.symbol)}</div>
            <div className="max-w-[200px] truncate text-xs text-stone-400">
              {row.name}
            </div>
          </div>
        ),
      },
      {
        key: "sector",
        label: "Sector",
        sortable: true,
        defaultDir: "asc",
        render: (row) => (
          <span className="block max-w-[160px] truncate text-xs text-stone-300">
            {row.sector}
          </span>
        ),
      },
      {
        key: "last_price",
        label: "Price",
        sortable: true,
        align: "right",
        render: (row) => <span className="font-medium text-white">{formatINR(row.last_price)}</span>,
      },
      {
        key: "score",
        label: "Score",
        sortable: true,
        align: "right",
        render: (row) => (
          <span className="font-display font-bold text-[#F0867C]">
            {row.score !== null && row.score !== undefined ? row.score.toFixed(2) : "—"}
          </span>
        ),
      },
      {
        key: "trend",
        label: "Trend",
        sortable: true,
        defaultDir: "asc",
        render: (row) => <TrendBadge trend={row.trend} />,
      },
    ];

    const optionalMap = {
      market_cap_cr: {
        key: "market_cap_cr",
        label: "Mkt Cap",
        sortable: true,
        align: "right",
        render: (row) =>
          row.market_cap_cr != null
            ? row.market_cap_cr >= 100000
              ? `₹${(row.market_cap_cr / 100000).toFixed(2)}L Cr`
              : `₹${Math.round(row.market_cap_cr).toLocaleString("en-IN")} Cr`
            : "Unknown",
      },
      ret_1m: {
        key: "ret_1m",
        label: "1M",
        sortable: true,
        align: "right",
        render: (row) => <ReturnCell value={row.ret_1m} />,
      },
      ret_3m: {
        key: "ret_3m",
        label: "3M",
        sortable: true,
        align: "right",
        render: (row) => <ReturnCell value={row.ret_3m} />,
      },
      ret_6m: {
        key: "ret_6m",
        label: "6M",
        sortable: true,
        align: "right",
        render: (row) => <ReturnCell value={row.ret_6m} />,
      },
      ret_12_1m: {
        key: "ret_12_1m",
        label: "12-1M",
        sortable: true,
        align: "right",
        render: (row) => <ReturnCell value={row.ret_12_1m} />,
      },
      volatility: {
        key: "volatility",
        label: "Vol (Ann)",
        sortable: true,
        align: "right",
        render: (row) =>
          row.volatility !== null && row.volatility !== undefined
            ? `${(row.volatility * 100).toFixed(1)}%`
            : "—",
      },
      pct_below_52w_high: {
        key: "pct_below_52w_high",
        label: "% Below 52W High",
        sortable: true,
        align: "right",
        render: (row) =>
          row.pct_below_52w_high !== null && row.pct_below_52w_high !== undefined
            ? `-${row.pct_below_52w_high.toFixed(1)}%`
            : "—",
      },
      rsi_14: {
        key: "rsi_14",
        label: "RSI(14)",
        sortable: true,
        align: "right",
        render: (row) =>
          row.rsi_14 !== null && row.rsi_14 !== undefined ? (
            <span
              className={
                row.rsi_14 >= 70
                  ? "text-amber-300"
                  : row.rsi_14 <= 30
                  ? "text-emerald-300"
                  : "text-stone-200"
              }
            >
              {row.rsi_14.toFixed(1)}
            </span>
          ) : (
            "—"
          ),
      },
      sparkline: {
        key: "sparkline",
        label: "30D",
        sortable: false,
        render: (row) => <Sparkline data={row.sparkline} height={28} />,
      },
    };

    return [
      ...base,
      ...OPTIONAL_COLUMNS.filter((c) => visibleCols[c.key]).map((c) => optionalMap[c.key]),
    ];
  }, [isWatched, toggleWatchlist, visibleCols]);

  const handleExportCsv = () => {
    const csvCols = [
      { key: "rank", label: "Rank" },
      { key: "symbol", label: "Symbol" },
      { key: "name", label: "Name" },
      { key: "sector", label: "Sector" },
      { key: "last_price", label: "Last Price" },
      { key: "ret_1m", label: "1M Return (%)", exportValue: (r) => (r.ret_1m != null ? (r.ret_1m * 100).toFixed(2) : "") },
      { key: "ret_3m", label: "3M Return (%)", exportValue: (r) => (r.ret_3m != null ? (r.ret_3m * 100).toFixed(2) : "") },
      { key: "ret_6m", label: "6M Return (%)", exportValue: (r) => (r.ret_6m != null ? (r.ret_6m * 100).toFixed(2) : "") },
      { key: "ret_12_1m", label: "12-1M Return (%)", exportValue: (r) => (r.ret_12_1m != null ? (r.ret_12_1m * 100).toFixed(2) : "") },
      { key: "volatility", label: "Volatility (%)", exportValue: (r) => (r.volatility != null ? (r.volatility * 100).toFixed(2) : "") },
      { key: "score", label: "Momentum Score", exportValue: (r) => (r.score != null ? r.score.toFixed(4) : "") },
      { key: "pct_below_52w_high", label: "% Below 52W High", exportValue: (r) => (r.pct_below_52w_high != null ? r.pct_below_52w_high.toFixed(2) : "") },
      { key: "rsi_14", label: "RSI(14)", exportValue: (r) => (r.rsi_14 != null ? r.rsi_14.toFixed(2) : "") },
      { key: "trend", label: "Trend" },
    ];
    exportRowsToCsv(`nifty500_screener_${data?.as_of || "latest"}.csv`, csvCols, filteredRows);
  };

  return (
    <AppLayout
      title="Momentum Screener"
      subtitle={`Filter and rank all ${stocks.length} Nifty 500 constituents · As of ${data?.as_of || "—"}`}
      actions={
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={!filteredRows.length}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-[#F0867C]/50 hover:bg-[#8C4570]/40 disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      }
    >
      {loading && !data ? (
        <SkeletonTable rows={12} cols={8} />
      ) : error && !data ? (
        <ErrorState title="Failed to load screener" message={error} onRetry={refetch} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#12131F]/80 px-4 py-2.5 text-xs text-stone-300">
            <span>
              Active Strategy Settings: <strong>{pipelineParams.method}</strong> · Lookback{" "}
              <strong>{pipelineParams.lookback_days}d</strong> / Skip{" "}
              <strong>{pipelineParams.skip_days}d</strong> · Top{" "}
              <strong>{pipelineParams.top_n}</strong>
            </span>
            <div className="flex items-center gap-3">
              <Link to="/picks" className="font-semibold text-[#F0867C] hover:underline">
                View Today&apos;s Picks
              </Link>
              <Link to="/strategy" className="text-stone-400 hover:text-white">
                Edit in Strategy Builder
              </Link>
            </div>
          </div>
          {/* Filters toolbar */}
          <div className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-4 shadow-lg">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
              <div className="relative xl:col-span-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search symbol, company, or sector..."
                  className="w-full rounded-xl border border-white/10 bg-[#07080F] py-2 pl-9 pr-8 text-sm text-white placeholder:text-stone-500 focus:border-[#F0867C] focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="xl:col-span-3">
                <select
                  value={sectorFilter}
                  onChange={(e) => handleSectorChange(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
                >
                  {sectors.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec === "All" ? "All Sectors" : sec}
                    </option>
                  ))}
                </select>
              </div>

              <div className="xl:col-span-2">
                <select
                  value={trendFilter}
                  onChange={(e) => setTrendFilter(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#07080F] px-3 py-2 text-sm text-white focus:border-[#F0867C] focus:outline-none"
                >
                  {TREND_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t === "All" ? "All Trends" : t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#07080F] px-3 py-1.5 xl:col-span-3">
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-[#F0867C]" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-[11px] text-stone-400">
                    <span>Min Score</span>
                    <span className="font-semibold text-white">
                      {minScore <= scoreBounds.min ? "Any" : minScore.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={scoreBounds.min}
                    max={scoreBounds.max}
                    step={0.1}
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer accent-[#F0867C]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-stone-400">
              <div className="flex items-center gap-3">
                <span>
                  Showing <strong className="text-white">{filteredRows.length}</strong> of{" "}
                  {stocks.length} stocks
                </span>
                {(query || sectorFilter !== "All" || trendFilter !== "All" || minScore > scoreBounds.min) && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="font-medium text-[#F0867C] hover:underline"
                  >
                    Reset filters
                  </button>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColMenu((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-stone-200 hover:border-white/25"
                >
                  <Columns className="h-3.5 w-3.5" />
                  Columns
                </button>
                {showColMenu && (
                  <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-white/15 bg-[#151624] p-2 shadow-2xl">
                    {OPTIONAL_COLUMNS.map((col) => (
                      <label
                        key={col.key}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 hover:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(visibleCols[col.key])}
                          onChange={() =>
                            setVisibleCols((prev) => ({
                              ...prev,
                              [col.key]: !prev[col.key],
                            }))
                          }
                          className="accent-[#F0867C]"
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={filteredRows}
            defaultSortKey="rank"
            defaultSortDir="asc"
            pageSize={25}
            onRowClick={(row) => navigate(`/stock/${encodeURIComponent(row.symbol)}`)}
            emptyTitle="No stocks match your filters"
            emptyDescription="Lower the minimum momentum score or clear the sector/trend filter."
          />
        </div>
      )}
    </AppLayout>
  );
}
