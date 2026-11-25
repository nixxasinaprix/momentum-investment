import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, Trash2 } from "lucide-react";
import AppLayout from "../components/AppLayout";
import DataTable from "../components/DataTable";
import Sparkline from "../components/Sparkline";
import { SkeletonTable } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/StateViews";
import TrendBadge from "../components/TrendBadge";
import { useCachedApi } from "../hooks/useCachedApi";
import { useWatchlist } from "../hooks/useWatchlist";
import { formatINR, formatPct, shortSymbol } from "../lib/format";

export default function Watchlist() {
  const navigate = useNavigate();
  const { watchlist, toggleWatchlist, clearWatchlist } = useWatchlist();
  const { data, loading, error, refetch } = useCachedApi("/api/screener");

  const watchedRows = useMemo(() => {
    const stocks = data?.stocks || [];
    const set = new Set(watchlist);
    return stocks.filter((s) => set.has(s.symbol));
  }, [data, watchlist]);

  const columns = [
    {
      key: "rank",
      label: "Rank",
      sortable: true,
      defaultDir: "asc",
      render: (r) => (r.rank ? `#${r.rank}` : "—"),
    },
    {
      key: "symbol",
      label: "Stock",
      sortable: true,
      defaultDir: "asc",
      render: (r) => (
        <div>
          <div className="font-semibold text-white">{shortSymbol(r.symbol)}</div>
          <div className="max-w-[200px] truncate text-xs text-stone-400">{r.name}</div>
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
      key: "score",
      label: "Score",
      sortable: true,
      align: "right",
      render: (r) => (
        <span className="font-bold text-[#F0867C]">
          {r.score != null ? r.score.toFixed(2) : "—"}
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
      key: "remove",
      label: "",
      sortable: false,
      align: "right",
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWatchlist(r.symbol);
          }}
          className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-500/15 hover:text-rose-300"
          aria-label="Remove from watchlist"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <AppLayout
      title="Watchlist"
      subtitle={`${watchlist.length} starred stocks saved locally in your browser`}
      actions={
        watchlist.length > 0 && (
          <button
            type="button"
            onClick={clearWatchlist}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-stone-300 hover:border-rose-400/50 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear All
          </button>
        )
      }
    >
      {loading && !data ? (
        <SkeletonTable rows={6} cols={7} />
      ) : error && !data ? (
        <ErrorState title="Could not load watchlist metrics" message={error} onRetry={refetch} />
      ) : !watchedRows.length ? (
        <EmptyState
          icon={Star}
          title="Your watchlist is empty"
          description="Star any stock in the Screener or on its Stock Detail page to track it here."
          action={
            <Link
              to="/screener"
              className="inline-flex items-center rounded-xl bg-[#8C4570] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7A3B61]"
            >
              Browse Screener
            </Link>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={watchedRows}
          defaultSortKey="rank"
          defaultSortDir="asc"
          onRowClick={(r) => navigate(`/stock/${encodeURIComponent(r.symbol)}`)}
        />
      )}
    </AppLayout>
  );
}
