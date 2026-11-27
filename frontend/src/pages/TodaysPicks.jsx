import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Layers,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import PipelineFunnel from "../components/PipelineFunnel";
import Sparkline from "../components/Sparkline";
import {
  Badge,
  Button,
  Card,
  DataTable,
  DisclaimerBanner,
  EmptyState,
  ErrorState,
  GlassCard,
  Input,
  PageContainer,
  PageHeader,
  SegmentedControl,
  Select,
  SkeletonCard,
  SkeletonTable,
  Tooltip,
  TrendBadge,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { usePipelineParams } from "../context/PipelineContext";
import { useWatchlist } from "../hooks/useWatchlist";
import { api } from "../lib/api";
import { formatINR, formatPct, shortSymbol } from "../lib/format";

function formatMcap(cr) {
  if (cr === null || cr === undefined) return "Unknown";
  if (cr >= 100000) return `₹${(cr / 100000).toFixed(2)}L Cr`;
  return `₹${Math.round(cr).toLocaleString("en-IN")} Cr`;
}

export default function TodaysPicks() {
  const { token } = useAuth();
  const { params } = usePipelineParams();
  const { isWatched, toggleWatchlist } = useWatchlist();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("cards");
  const [exclSearch, setExclSearch] = useState("");
  const [exclType, setExclType] = useState("failed_filters");

  const runNow = () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    api("/api/pipeline/run", {
      method: "POST",
      body: params,
      token,
    })
      .then((res) => setData(res))
      .catch((err) => setError(err.message || "Failed to run pipeline"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    let active = true;
    api("/api/pipeline/run", {
      method: "POST",
      body: params,
      token,
    })
      .then((res) => {
        if (active) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load today's picks");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, params]);

  const filteredExcluded = useMemo(() => {
    const list = data?.excluded || [];
    const q = exclSearch.trim().toLowerCase();
    return list.filter((item) => {
      if (exclType === "failed_filters" && item.passed_filters) return false;
      if (exclType === "ranked_out" && !item.passed_filters) return false;
      if (q) {
        const hay = `${item.symbol} ${item.name} ${item.sector} ${item.removal_reason || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, exclSearch, exclType]);

  const selectedCols = [
    {
      key: "watch",
      label: "",
      sortable: false,
      render: (r) => {
        const watched = isWatched(r.symbol);
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWatchlist(r.symbol);
            }}
            aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
            className={`rounded-lg p-1 transition ${
              watched
                ? "text-amber-500 dark:text-brand-gold"
                : "text-stone-400 hover:text-stone-700 dark:text-stone-600 dark:hover:text-stone-300"
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
      render: (r) => (
        <span className="font-bold tabular-nums text-stone-900 dark:text-stone-100">
          #{r.rank}
        </span>
      ),
    },
    {
      key: "symbol",
      label: "Stock",
      sortable: true,
      defaultDir: "asc",
      render: (r) => (
        <div>
          <div className="font-semibold text-stone-900 dark:text-stone-100">
            {shortSymbol(r.symbol)}
          </div>
          <div className="max-w-[180px] truncate text-xs text-stone-500 dark:text-stone-400">
            {r.name}
          </div>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      sortable: true,
      render: (r) => (
        <Badge variant={r.action === "BUY" ? "emerald" : "plum"} size="xs">
          {r.action}
        </Badge>
      ),
    },
    {
      key: "score",
      label: "Score",
      sortable: true,
      align: "right",
      render: (r) => (
        <span className="font-display font-bold text-brand-plum dark:text-brand-coral">
          {r.score != null ? r.score.toFixed(3) : "—"}
        </span>
      ),
    },
    {
      key: "ret_12_1m",
      label: "12-1M",
      sortable: true,
      align: "right",
      render: (r) => (
        <span
          className={`font-semibold ${
            (r.ret_12_1m ?? 0) >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {formatPct(r.ret_12_1m, 1)}
        </span>
      ),
    },
    {
      key: "market_cap_cr",
      label: "Mkt Cap",
      sortable: true,
      align: "right",
      render: (r) => (
        <span className="text-xs text-stone-600 dark:text-stone-300">
          {formatMcap(r.market_cap_cr)}
        </span>
      ),
    },
    {
      key: "trend",
      label: "Trend",
      sortable: true,
      render: (r) => <TrendBadge trend={r.trend} />,
    },
    {
      key: "sparkline",
      label: "30D",
      sortable: false,
      render: (r) => <Sparkline data={r.sparkline} height={28} />,
    },
    {
      key: "reason_picked",
      label: "Why Picked",
      sortable: false,
      render: (r) => (
        <span className="block max-w-[260px] text-xs text-stone-600 dark:text-stone-300">
          {r.reason_picked}
        </span>
      ),
    },
  ];

  const excludedCols = [
    {
      key: "symbol",
      label: "Stock",
      sortable: true,
      defaultDir: "asc",
      render: (r) => (
        <div>
          <div className="font-semibold text-stone-900 dark:text-stone-100">
            {shortSymbol(r.symbol)}
          </div>
          <div className="max-w-[180px] truncate text-xs text-stone-500 dark:text-stone-400">
            {r.name}
          </div>
        </div>
      ),
    },
    { key: "sector", label: "Sector", sortable: true },
    {
      key: "last_price",
      label: "Price",
      sortable: true,
      align: "right",
      render: (r) => formatINR(r.last_price),
    },
    {
      key: "market_cap_cr",
      label: "Mkt Cap",
      sortable: true,
      align: "right",
      render: (r) => formatMcap(r.market_cap_cr),
    },
    {
      key: "avg_traded_value_cr",
      label: "20D Turnover",
      sortable: true,
      align: "right",
      render: (r) =>
        r.avg_traded_value_cr != null ? `₹${r.avg_traded_value_cr.toFixed(1)} Cr` : "—",
    },
    {
      key: "removal_reason",
      label: "Removal Reason",
      sortable: true,
      render: (r) => (
        <Badge variant="red" size="xs" className="whitespace-normal text-left">
          {r.removal_reason}
        </Badge>
      ),
    },
  ];

  const changes = data?.changes || { buy: [], sell: [], hold: [] };

  return (
    <AppLayout
      title="Today's Picks"
      subtitle={
        data?.as_of
          ? `Top ${data.selected?.length || 0} Nifty 500 momentum portfolio as of ${data.as_of}`
          : "Rule-based Nifty 500 momentum stock picker"
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" to="/strategy">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tune Rules</span>
          </Button>
          <Button variant="primary" size="sm" to="/backtest?autorun=1">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Backtest</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={runNow}
            disabled={loading}
            aria-label="Refresh picks"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      }
    >
      <PageContainer>
        <DisclaimerBanner
          description="Picks are generated mechanically from historical prices and cached market-cap snapshots."
          right={
            <>
              <span>
                Method: <strong>{params.method}</strong>
              </span>
              <span>
                Lookback:{" "}
                <strong>
                  {params.lookback_days}d / {params.skip_days}d
                </strong>
              </span>
              <span>
                Min Cap:{" "}
                <strong>₹{params.min_market_cap_cr.toLocaleString("en-IN")} Cr</strong>
              </span>
              <Link
                to="/screener"
                className="font-semibold text-brand-plum underline hover:text-brand-plumHover dark:text-brand-coral dark:hover:text-brand-gold"
              >
                Open Screener
              </Link>
            </>
          }
        />

        {loading && !data ? (
          <div className="space-y-6">
            <SkeletonCard count={4} />
            <SkeletonTable rows={8} cols={6} />
          </div>
        ) : error && !data ? (
          <ErrorState title="Pipeline failed to run" message={error} onRetry={runNow} />
        ) : !data ? (
          <EmptyState
            title="No picks available"
            description="Run the pipeline to generate picks."
          />
        ) : (
          <>
            <PipelineFunnel stages={data.stages} />

            {/* Selected portfolio */}
            <section className="min-w-0 space-y-4">
              <PageHeader
                title={`Selected Portfolio (${data.selected.length} Stocks · Equal Weight ${
                  data.selected.length > 0
                    ? `${(100 / data.selected.length).toFixed(2)}%`
                    : "0%"
                })`}
                subtitle="Click any stock for full technical indicators, RSI, and KaTeX score math"
                actions={
                  <SegmentedControl
                    value={viewMode}
                    onChange={setViewMode}
                    options={[
                      { value: "cards", label: "Cards" },
                      { value: "table", label: "Table" },
                    ]}
                  />
                }
              />

              {!data.selected.length ? (
                <EmptyState
                  title="No stocks passed all filters"
                  description="Relax one or more quality filters in Strategy Builder to select a portfolio."
                  action={
                    <Button variant="primary" size="md" to="/strategy">
                      Adjust Filters
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  }
                />
              ) : viewMode === "table" ? (
                <DataTable
                  columns={selectedCols}
                  rows={data.selected}
                  defaultSortKey="rank"
                  defaultSortDir="asc"
                  pageSize={25}
                  stickyHeader
                  onRowClick={(r) => navigate(`/stock/${encodeURIComponent(r.symbol)}`)}
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {data.selected.map((stock) => {
                    const watched = isWatched(stock.symbol);
                    return (
                      <GlassCard
                        key={stock.symbol}
                        interactive
                        padding="p-4"
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/stock/${encodeURIComponent(stock.symbol)}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/stock/${encodeURIComponent(stock.symbol)}`);
                          }
                        }}
                        className="group flex min-w-0 flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge variant="plum" size="xs">
                                  #{stock.rank}
                                </Badge>
                                <span className="truncate font-display text-base font-bold text-stone-900 dark:text-stone-100">
                                  {shortSymbol(stock.symbol)}
                                </span>
                                <Badge
                                  variant={stock.action === "BUY" ? "emerald" : "plum"}
                                  size="xs"
                                >
                                  {stock.action}
                                </Badge>
                              </div>
                              <p className="mt-1 truncate text-xs text-stone-600 dark:text-stone-400">
                                {stock.name} · {stock.sector}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWatchlist(stock.symbol);
                              }}
                              className={`shrink-0 rounded-lg p-1 transition ${
                                watched
                                  ? "text-amber-500 dark:text-brand-gold"
                                  : "text-stone-400 hover:text-stone-700 dark:text-stone-600 dark:hover:text-stone-300"
                              }`}
                              aria-label="Toggle watchlist"
                            >
                              <Star className="h-4 w-4" fill={watched ? "currentColor" : "none"} />
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-lg font-bold tabular-nums text-stone-900 dark:text-stone-100">
                                {formatINR(stock.last_price)}
                              </div>
                              <div className="text-[11px] text-stone-600 dark:text-stone-400">
                                Cap: {formatMcap(stock.market_cap_cr)}
                              </div>
                            </div>
                            <div className="w-24 shrink-0">
                              <Sparkline data={stock.sparkline} height={34} />
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-200/80 pt-2.5 text-xs dark:border-stone-800">
                            <TrendBadge trend={stock.trend} />
                            <span className="font-display font-bold tabular-nums text-brand-plum dark:text-brand-coral">
                              Score {stock.score != null ? stock.score.toFixed(2) : "—"}
                            </span>
                          </div>
                        </div>

                        <p className="mt-2.5 flex items-center justify-between gap-1 text-[11px] leading-snug text-stone-600 dark:text-stone-400">
                          <span className="line-clamp-2">{stock.reason_picked}</span>
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-plum dark:text-stone-500 dark:group-hover:text-brand-coral" />
                        </p>
                      </GlassCard>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Buy / Sell / Hold changes since last month */}
            <GlassCard as="section">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                      Rebalance Changes Since Last Month
                    </h2>
                    <Tooltip content="Compares today's top-N survivors with the portfolio from the prior month-end close." />
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Comparing {data.as_of} against prior month-end ({data.prev_rebalance_date || "N/A"})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card
                  variant="well"
                  padding="p-4"
                  className="border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/25 dark:bg-emerald-500/[0.06]"
                >
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Buy · New Entries ({changes.buy.length})
                  </div>
                  {!changes.buy.length ? (
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      No new additions this month.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {changes.buy.map((b) => (
                        <Link
                          key={b.symbol}
                          to={`/stock/${encodeURIComponent(b.symbol)}`}
                          className="flex items-center justify-between rounded-lg bg-white/80 px-2.5 py-1.5 text-xs transition hover:bg-white dark:bg-stone-900/70 dark:hover:bg-stone-900"
                        >
                          <span className="font-semibold text-stone-900 dark:text-stone-100">
                            #{b.rank} {shortSymbol(b.symbol)}
                          </span>
                          <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                            {b.score != null ? b.score.toFixed(2) : "—"}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>

                <Card
                  variant="well"
                  padding="p-4"
                  className="border-red-200 bg-red-50/70 dark:border-red-500/25 dark:bg-red-500/[0.06]"
                >
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
                    Sell · Exits ({changes.sell.length})
                  </div>
                  {!changes.sell.length ? (
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      No exits since last month.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {changes.sell.map((s) => (
                        <Link
                          key={s.symbol}
                          to={`/stock/${encodeURIComponent(s.symbol)}`}
                          className="block rounded-lg bg-white/80 px-2.5 py-1.5 text-xs transition hover:bg-white dark:bg-stone-900/70 dark:hover:bg-stone-900"
                        >
                          <div className="flex justify-between font-semibold text-stone-900 dark:text-stone-100">
                            <span>{shortSymbol(s.symbol)}</span>
                            <span className="text-stone-500 dark:text-stone-400">
                              was #{s.prev_rank}
                            </span>
                          </div>
                          <div className="truncate text-[11px] text-red-700/90 dark:text-red-300/85">
                            {s.reason}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>

                <Card
                  variant="well"
                  padding="p-4"
                  className="border-brand-plum/25 bg-brand-plum/[0.06] dark:border-brand-mauve/30 dark:bg-brand-mauve/[0.07]"
                >
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-plum dark:text-brand-mauve">
                    Hold · Retained ({changes.hold.length})
                  </div>
                  {!changes.hold.length ? (
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      No retained holdings.
                    </p>
                  ) : (
                    <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                      {changes.hold.map((h) => (
                        <Link
                          key={h.symbol}
                          to={`/stock/${encodeURIComponent(h.symbol)}`}
                          className="flex items-center justify-between rounded-lg bg-white/80 px-2.5 py-1.5 text-xs transition hover:bg-white dark:bg-stone-900/70 dark:hover:bg-stone-900"
                        >
                          <span className="font-semibold text-stone-900 dark:text-stone-100">
                            #{h.rank} {shortSymbol(h.symbol)}
                          </span>
                          <span className="text-stone-500 dark:text-stone-400">
                            prev #{h.prev_rank}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </GlassCard>

            {/* Excluded Stocks diagnostics */}
            <section className="min-w-0 space-y-4">
              <PageHeader
                title={
                  <span className="inline-flex items-center gap-2">
                    <Layers className="h-4 w-4 text-brand-plum dark:text-brand-coral" />
                    Excluded Stocks ({filteredExcluded.length})
                  </span>
                }
                subtitle="Every non-selected Nifty 500 stock with the exact filter or rank cutoff that removed it"
                actions={
                  <div className="flex w-full max-w-full flex-wrap items-center gap-2 sm:w-auto">
                    <Input
                      icon={Search}
                      type="text"
                      value={exclSearch}
                      onChange={(e) => setExclSearch(e.target.value)}
                      onClear={() => setExclSearch("")}
                      placeholder="Filter excluded or reason..."
                      className="min-w-0 flex-1 sm:w-52 sm:flex-none"
                      inputClassName="py-1.5 text-xs"
                    />
                    <Select
                      value={exclType}
                      onChange={(e) => setExclType(e.target.value)}
                      className="min-w-0 flex-1 sm:w-auto sm:flex-none"
                      selectClassName="py-1.5 text-xs"
                    >
                      <option value="failed_filters">Failed Quality Filters</option>
                      <option value="ranked_out">Passed Filters, Outside Top N</option>
                      <option value="all">All Excluded ({data.excluded.length})</option>
                    </Select>
                  </div>
                }
              />

              <DataTable
                columns={excludedCols}
                rows={filteredExcluded}
                defaultSortKey="symbol"
                defaultSortDir="asc"
                pageSize={15}
                stickyHeader
                onRowClick={(r) => navigate(`/stock/${encodeURIComponent(r.symbol)}`)}
              />
            </section>
          </>
        )}
      </PageContainer>
    </AppLayout>
  );
}
