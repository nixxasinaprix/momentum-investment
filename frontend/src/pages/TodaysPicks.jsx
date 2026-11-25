import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Info,
  Layers,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import DataTable from "../components/DataTable";
import PipelineFunnel from "../components/PipelineFunnel";
import { SkeletonCard, SkeletonTable } from "../components/Skeleton";
import Sparkline from "../components/Sparkline";
import { EmptyState, ErrorState } from "../components/StateViews";
import TrendBadge from "../components/TrendBadge";
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

const ACTION_BADGE = {
  BUY: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  HOLD: "border-sky-500/35 bg-sky-500/15 text-sky-300",
};

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
            className={watched ? "text-amber-400" : "text-stone-600 hover:text-stone-300"}
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
      render: (r) => <span className="font-bold text-white">#{r.rank}</span>,
    },
    {
      key: "symbol",
      label: "Stock",
      sortable: true,
      defaultDir: "asc",
      render: (r) => (
        <div>
          <div className="font-semibold text-white">{shortSymbol(r.symbol)}</div>
          <div className="max-w-[180px] truncate text-xs text-stone-400">{r.name}</div>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      sortable: true,
      render: (r) => (
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
            ACTION_BADGE[r.action] || ACTION_BADGE.HOLD
          }`}
        >
          {r.action}
        </span>
      ),
    },
    {
      key: "score",
      label: "Score",
      sortable: true,
      align: "right",
      render: (r) => (
        <span className="font-display font-bold text-[#F0867C]">
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
        <span className={(r.ret_12_1m ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}>
          {formatPct(r.ret_12_1m, 1)}
        </span>
      ),
    },
    {
      key: "market_cap_cr",
      label: "Mkt Cap",
      sortable: true,
      align: "right",
      render: (r) => <span className="text-xs text-stone-300">{formatMcap(r.market_cap_cr)}</span>,
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
        <span className="block max-w-[260px] text-xs text-stone-300">
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
          <div className="font-semibold text-white">{shortSymbol(r.symbol)}</div>
          <div className="max-w-[180px] truncate text-xs text-stone-400">{r.name}</div>
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
        <span className="inline-block rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-200">
          {r.removal_reason}
        </span>
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
          <Link
            to="/strategy"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-stone-200 hover:border-[#F0867C]/50 hover:text-white"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Tune Rules
          </Link>
          <Link
            to="/backtest?autorun=1"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#8C4570] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#7A3B61]"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Backtest
          </Link>
          <button
            type="button"
            onClick={runNow}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-stone-200 hover:border-white/30 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Educational Disclaimer */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-2.5 text-xs text-amber-100/90">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0 text-amber-300" />
            <span>
              <strong>Educational Tool — Not Investment Advice.</strong> Picks are generated mechanically from historical prices and cached market-cap snapshots.
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-amber-200/80">
            <span>Method: <strong>{params.method}</strong></span>
            <span>Lookback: <strong>{params.lookback_days}d / {params.skip_days}d</strong></span>
            <span>Min Cap: <strong>₹{params.min_market_cap_cr.toLocaleString("en-IN")} Cr</strong></span>
            <Link to="/screener" className="underline hover:text-white">
              Open Screener
            </Link>
          </div>
        </div>

        {loading && !data ? (
          <div className="space-y-6">
            <SkeletonCard count={4} />
            <SkeletonTable rows={8} cols={6} />
          </div>
        ) : error && !data ? (
          <ErrorState title="Pipeline failed to run" message={error} onRetry={runNow} />
        ) : !data ? (
          <EmptyState title="No picks available" description="Run the pipeline to generate picks." />
        ) : (
          <>
            <PipelineFunnel stages={data.stages} />

            {/* Selected portfolio */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-white">
                    Selected Portfolio ({data.selected.length} Stocks · Equal Weight{" "}
                    {data.selected.length > 0
                      ? `${(100 / data.selected.length).toFixed(2)}%`
                      : "0%"}
                    )
                  </h2>
                  <p className="text-xs text-stone-400">
                    Click any stock for full technical indicators, RSI, and KaTeX score math
                  </p>
                </div>

                <div className="flex rounded-xl border border-white/10 bg-[#12131F] p-0.5 text-xs">
                  {["cards", "table"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className={`rounded-lg px-3 py-1 font-semibold capitalize transition ${
                        viewMode === mode
                          ? "bg-[#8C4570] text-white"
                          : "text-stone-400 hover:text-white"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {!data.selected.length ? (
                <EmptyState
                  title="No stocks passed all filters"
                  description="Relax one or more quality filters in Strategy Builder to select a portfolio."
                  action={
                    <Link
                      to="/strategy"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#8C4570] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Adjust Filters
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  }
                />
              ) : viewMode === "table" ? (
                <DataTable
                  columns={selectedCols}
                  rows={data.selected}
                  defaultSortKey="rank"
                  defaultSortDir="asc"
                  pageSize={25}
                  onRowClick={(r) => navigate(`/stock/${encodeURIComponent(r.symbol)}`)}
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {data.selected.map((stock) => {
                    const watched = isWatched(stock.symbol);
                    return (
                      <div
                        key={stock.symbol}
                        onClick={() => navigate(`/stock/${encodeURIComponent(stock.symbol)}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/stock/${encodeURIComponent(stock.symbol)}`);
                          }
                        }}
                        className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-white/10 bg-[#12131F]/90 p-4 shadow-lg transition hover:border-[#F0867C]/45 hover:bg-[#181626]"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-bold text-[#F0867C]">
                                  #{stock.rank}
                                </span>
                                <span className="truncate font-display text-base font-bold text-white">
                                  {shortSymbol(stock.symbol)}
                                </span>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                    ACTION_BADGE[stock.action] || ACTION_BADGE.HOLD
                                  }`}
                                >
                                  {stock.action}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs text-stone-400">
                                {stock.name} · {stock.sector}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWatchlist(stock.symbol);
                              }}
                              className={`shrink-0 rounded-lg p-1 ${
                                watched
                                  ? "text-amber-400"
                                  : "text-stone-600 hover:text-stone-300"
                              }`}
                              aria-label="Toggle watchlist"
                            >
                              <Star className="h-4 w-4" fill={watched ? "currentColor" : "none"} />
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <div>
                              <div className="text-lg font-bold text-white">
                                {formatINR(stock.last_price)}
                              </div>
                              <div className="text-[11px] text-stone-400">
                                Cap: {formatMcap(stock.market_cap_cr)}
                              </div>
                            </div>
                            <div className="w-24">
                              <Sparkline data={stock.sparkline} height={34} />
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-xs">
                            <TrendBadge trend={stock.trend} />
                            <span className="font-display font-bold text-[#F0867C]">
                              Score {stock.score != null ? stock.score.toFixed(2) : "—"}
                            </span>
                          </div>
                        </div>

                        <p className="mt-2.5 flex items-center justify-between gap-1 text-[11px] leading-snug text-stone-400">
                          <span className="line-clamp-2">{stock.reason_picked}</span>
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-stone-500 group-hover:text-[#F0867C]" />
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Buy / Sell / Hold changes since last month */}
            <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold text-white">
                    Rebalance Changes Since Last Month
                  </h2>
                  <p className="text-xs text-stone-400">
                    Comparing {data.as_of} against prior month-end ({data.prev_rebalance_date || "N/A"})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                    Buy · New Entries ({changes.buy.length})
                  </div>
                  {!changes.buy.length ? (
                    <p className="text-xs text-stone-400">No new additions this month.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {changes.buy.map((b) => (
                        <Link
                          key={b.symbol}
                          to={`/stock/${encodeURIComponent(b.symbol)}`}
                          className="flex items-center justify-between rounded-lg bg-black/25 px-2.5 py-1.5 text-xs hover:bg-black/45"
                        >
                          <span className="font-semibold text-white">
                            #{b.rank} {shortSymbol(b.symbol)}
                          </span>
                          <span className="text-emerald-300">
                            {b.score != null ? b.score.toFixed(2) : "—"}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.05] p-4">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-rose-300">
                    Sell · Exits ({changes.sell.length})
                  </div>
                  {!changes.sell.length ? (
                    <p className="text-xs text-stone-400">No exits since last month.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {changes.sell.map((s) => (
                        <Link
                          key={s.symbol}
                          to={`/stock/${encodeURIComponent(s.symbol)}`}
                          className="block rounded-lg bg-black/25 px-2.5 py-1.5 text-xs hover:bg-black/45"
                        >
                          <div className="flex justify-between font-semibold text-white">
                            <span>{shortSymbol(s.symbol)}</span>
                            <span className="text-stone-400">was #{s.prev_rank}</span>
                          </div>
                          <div className="truncate text-[11px] text-rose-200/80">
                            {s.reason}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.05] p-4">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-sky-300">
                    Hold · Retained ({changes.hold.length})
                  </div>
                  {!changes.hold.length ? (
                    <p className="text-xs text-stone-400">No retained holdings.</p>
                  ) : (
                    <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                      {changes.hold.map((h) => (
                        <Link
                          key={h.symbol}
                          to={`/stock/${encodeURIComponent(h.symbol)}`}
                          className="flex items-center justify-between rounded-lg bg-black/25 px-2.5 py-1.5 text-xs hover:bg-black/45"
                        >
                          <span className="font-semibold text-white">
                            #{h.rank} {shortSymbol(h.symbol)}
                          </span>
                          <span className="text-stone-400">prev #{h.prev_rank}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Excluded Stocks diagnostics */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
                    <Layers className="h-4 w-4 text-[#F0867C]" />
                    Excluded Stocks ({filteredExcluded.length})
                  </h2>
                  <p className="text-xs text-stone-400">
                    Every non-selected Nifty 500 stock with the exact filter or rank cutoff that removed it
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
                    <input
                      type="text"
                      value={exclSearch}
                      onChange={(e) => setExclSearch(e.target.value)}
                      placeholder="Filter excluded or reason..."
                      className="rounded-xl border border-white/10 bg-[#12131F] py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-stone-500 focus:border-[#F0867C] focus:outline-none"
                    />
                  </div>
                  <select
                    value={exclType}
                    onChange={(e) => setExclType(e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#12131F] px-3 py-1.5 text-xs text-white focus:border-[#F0867C] focus:outline-none"
                  >
                    <option value="failed_filters">Failed Quality Filters</option>
                    <option value="ranked_out">Passed Filters, Outside Top N</option>
                    <option value="all">All Excluded ({data.excluded.length})</option>
                  </select>
                </div>
              </div>

              <DataTable
                columns={excludedCols}
                rows={filteredExcluded}
                defaultSortKey="symbol"
                defaultSortDir="asc"
                pageSize={15}
                onRowClick={(r) => navigate(`/stock/${encodeURIComponent(r.symbol)}`)}
              />
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
