import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Columns, Download, Search, SlidersHorizontal, Star } from "lucide-react";
import AppLayout from "../components/AppLayout";
import Sparkline from "../components/Sparkline";
import {
  Badge,
  Button,
  Card,
  DataTable,
  ErrorState,
  GlassCard,
  Input,
  PageContainer,
  Select,
  SkeletonTable,
  TrendBadge,
} from "../components/ui";
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
    return <span className="text-[var(--text-muted)]">—</span>;
  }
  const cls =
    value >= 0
      ? "text-emerald-700 dark:text-emerald-300"
      : "text-red-700 dark:text-red-300";
  return <span className={`font-bold ${cls}`}>{formatPct(value, 1)}</span>;
}

export default function Screener() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { params: pipelineParams } = usePipelineParams();
  const { data, loading, error, refetch } = useCachedApi("/api/screener");
  const { isWatched, toggleWatchlist } = useWatchlist();

  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [sectorFilter, setSectorFilter] = useState(
    () => searchParams.get("sector") || "All"
  );
  const [trendFilter, setTrendFilter] = useState("All");
  const [minScore, setMinScore] = useState(-3);
  const [showColMenu, setShowColMenu] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Object.fromEntries(OPTIONAL_COLUMNS.map((c) => [c.key, c.defaultVisible]))
  );

  const stocks = useMemo(() => data?.stocks || [], [data]);

  const sectors = useMemo(() => {
    const unique = Array.from(
      new Set(stocks.map((s) => s.sector).filter(Boolean))
    ).sort();
    return ["All", ...unique];
  }, [stocks]);

  const scoreBounds = useMemo(() => {
    const scores = stocks
      .map((s) => s.score)
      .filter((v) => v !== null && v !== undefined);
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
                  ? "text-amber-500 hover:bg-amber-500/15 dark:text-brand-gold"
                  : "text-brand-plum/35 hover:bg-brand-coral/15 hover:text-brand-plum dark:text-brand-coral/35 dark:hover:text-brand-coral"
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
        render: (row) =>
          row.rank !== null ? (
            <Badge variant="plum" size="xs" className="tabular-nums">
              #{row.rank}
            </Badge>
          ) : (
            <span className="text-[var(--text-muted)]">—</span>
          ),
      },
      {
        key: "symbol",
        label: "Stock",
        sortable: true,
        defaultDir: "asc",
        render: (row) => (
          <div className="min-w-[140px]">
            <div className="font-bold text-[var(--text-primary)]">
              {shortSymbol(row.symbol)}
            </div>
            <div className="max-w-[200px] truncate text-xs text-[var(--text-muted)]">
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
          <span className="block max-w-[160px] truncate text-xs font-medium text-[var(--text-secondary)]">
            {row.sector}
          </span>
        ),
      },
      {
        key: "last_price",
        label: "Price",
        sortable: true,
        align: "right",
        render: (row) => (
          <span className="font-bold text-[var(--text-primary)]">
            {formatINR(row.last_price)}
          </span>
        ),
      },
      {
        key: "score",
        label: "Score",
        sortable: true,
        align: "right",
        render: (row) =>
          row.score !== null && row.score !== undefined ? (
            <Badge variant="coral" size="xs" className="font-display tabular-nums">
              {row.score.toFixed(2)}
            </Badge>
          ) : (
            "—"
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
        render: (row) => (
          <span className="whitespace-nowrap">
            {row.market_cap_cr != null
              ? row.market_cap_cr >= 100000
                ? `₹${(row.market_cap_cr / 100000).toFixed(2)}L Cr`
                : `₹${Math.round(row.market_cap_cr).toLocaleString("en-IN")} Cr`
              : "Unknown"}
          </span>
        ),
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
                  ? "font-bold text-amber-700 dark:text-brand-gold"
                  : row.rsi_14 <= 30
                  ? "font-bold text-emerald-700 dark:text-emerald-300"
                  : "text-[var(--text-secondary)]"
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
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportCsv}
          disabled={!filteredRows.length}
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export CSV</span>
        </Button>
      }
    >
      {loading && !data ? (
        <SkeletonTable rows={12} cols={8} />
      ) : error && !data ? (
        <ErrorState title="Failed to load screener" message={error} onRetry={refetch} />
      ) : (
        <PageContainer className="space-y-4">
          <GlassCard
            padding="px-4 py-2.5"
            className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]"
          >
            <span>
              Active Strategy Settings:{" "}
              <strong className="text-[var(--text-primary)]">
                {pipelineParams.method}
              </strong>{" "}
              · Lookback{" "}
              <strong className="text-[var(--text-primary)]">
                {pipelineParams.lookback_days}d
              </strong>{" "}
              / Skip{" "}
              <strong className="text-[var(--text-primary)]">
                {pipelineParams.skip_days}d
              </strong>{" "}
              · Top{" "}
              <strong className="text-[var(--text-primary)]">
                {pipelineParams.top_n}
              </strong>
            </span>
            <div className="flex items-center gap-3">
              <Link
                to="/picks"
                className="font-bold text-brand-plum hover:underline dark:text-brand-coral"
              >
                View Today&apos;s Picks
              </Link>
              <Link
                to="/strategy"
                className="font-medium text-[var(--text-muted)] hover:text-brand-plum dark:hover:text-brand-coral"
              >
                Edit in Strategy Builder
              </Link>
            </div>
          </GlassCard>

          {/* Filters toolbar */}
          <GlassCard padding="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
              <div className="xl:col-span-4">
                <Input
                  icon={Search}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onClear={() => setQuery("")}
                  placeholder="Search symbol, company, or sector..."
                />
              </div>

              <div className="xl:col-span-3">
                <Select
                  aria-label="Filter by sector"
                  value={sectorFilter}
                  onChange={(e) => handleSectorChange(e.target.value)}
                >
                  {sectors.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec === "All" ? "All Sectors" : sec}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="xl:col-span-2">
                <Select
                  aria-label="Filter by trend"
                  value={trendFilter}
                  onChange={(e) => setTrendFilter(e.target.value)}
                >
                  {TREND_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t === "All" ? "All Trends" : t}
                    </option>
                  ))}
                </Select>
              </div>

              <Card
                variant="well"
                padding="px-3 py-1.5"
                className="flex items-center gap-3 xl:col-span-3"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-brand-plum dark:text-brand-coral" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                    <span>Min Score</span>
                    <span className="font-bold tabular-nums text-brand-plum dark:text-brand-coral">
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
                    className="momentum-slider mt-1 w-full cursor-pointer"
                  />
                </div>
              </Card>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-table)] pt-3 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-3">
                <span>
                  Showing{" "}
                  <strong className="text-[var(--text-primary)]">
                    {filteredRows.length}
                  </strong>{" "}
                  of {stocks.length} stocks
                </span>
                {(query ||
                  sectorFilter !== "All" ||
                  trendFilter !== "All" ||
                  minScore > scoreBounds.min) && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="font-bold text-brand-plum hover:underline dark:text-brand-coral"
                  >
                    Reset filters
                  </button>
                )}
              </div>

              <div className="relative">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setShowColMenu((v) => !v)}
                >
                  <Columns className="h-3.5 w-3.5" />
                  Columns
                </Button>
                {showColMenu && (
                  <div className="lab-card absolute right-0 z-20 mt-2 w-52 rounded-2xl p-2">
                    {OPTIONAL_COLUMNS.map((col) => (
                      <label
                        key={col.key}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-brand-coral/15 hover:text-[var(--text-primary)]"
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
                          className="accent-brand-plum dark:accent-brand-coral"
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          <DataTable
            columns={columns}
            rows={filteredRows}
            defaultSortKey="rank"
            defaultSortDir="asc"
            pageSize={25}
            stickyHeader
            zebra
            onRowClick={(row) => navigate(`/stock/${encodeURIComponent(row.symbol)}`)}
            emptyTitle="No stocks match your filters"
            emptyDescription="Lower the minimum momentum score or clear the sector/trend filter."
          />
        </PageContainer>
      )}
    </AppLayout>
  );
}
