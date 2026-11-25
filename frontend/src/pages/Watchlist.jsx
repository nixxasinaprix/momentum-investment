import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Plus, Star, Trash2 } from "lucide-react";
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
  const [addPicker, setAddPicker] = useState("");

  const allStocks = useMemo(() => data?.stocks || [], [data]);

  const watchedRows = useMemo(() => {
    const set = new Set(watchlist);
    return allStocks.filter((s) => set.has(s.symbol));
  }, [allStocks, watchlist]);

  const availableToAdd = useMemo(() => {
    const set = new Set(watchlist);
    return allStocks.filter((s) => !set.has(s.symbol));
  }, [allStocks, watchlist]);

  const handleAdd = (sym) => {
    if (!sym) return;
    toggleWatchlist(sym);
    setAddPicker("");
  };

  const columns = [
    {
      key: "rank",
      label: "Rank",
      sortable: true,
      defaultDir: "asc",
      render: (r) => (
        <span className="font-semibold text-white">
          {r.rank != null ? `#${r.rank}` : "—"}
        </span>
      ),
    },
    {
      key: "rank_change",
      label: "1M Rank Δ",
      sortable: true,
      align: "right",
      render: (r) => {
        if (r.rank_change === null || r.rank_change === undefined) {
          return <span className="text-stone-500">—</span>;
        }
        if (r.rank_change > 0) {
          return (
            <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-400">
              <ArrowUp className="h-3 w-3" />+{r.rank_change}
            </span>
          );
        }
        if (r.rank_change < 0) {
          return (
            <span className="inline-flex items-center gap-0.5 font-semibold text-rose-400">
              <ArrowDown className="h-3 w-3" />
              {r.rank_change}
            </span>
          );
        }
        return <span className="text-stone-400">0</span>;
      },
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
          aria-label={`Remove ${r.symbol} from watchlist`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <AppLayout
      title="Watchlist"
      subtitle={`${watchlist.length} starred stocks · Tracks rank changes since last month`}
      actions={
        <div className="flex items-center gap-2">
          {availableToAdd.length > 0 && (
            <div className="relative flex items-center">
              <Plus className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#F0867C]" />
              <select
                value={addPicker}
                onChange={(e) => handleAdd(e.target.value)}
                aria-label="Add stock to watchlist"
                className="rounded-xl border border-white/15 bg-[#12131F] py-1.5 pl-8 pr-3 text-xs font-medium text-white focus:border-[#F0867C] focus:outline-none"
              >
                <option value="">Add stock...</option>
                {availableToAdd.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {shortSymbol(s.symbol)} — {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {watchlist.length > 0 && (
            <button
              type="button"
              onClick={clearWatchlist}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-stone-300 hover:border-rose-400/50 hover:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear All
            </button>
          )}
        </div>
      }
    >
      {loading && !data ? (
        <SkeletonTable rows={6} cols={8} />
      ) : error && !data ? (
        <ErrorState title="Could not load watchlist metrics" message={error} onRetry={refetch} />
      ) : !watchedRows.length ? (
        <EmptyState
          icon={Star}
          title="Your watchlist is empty"
          description="Use the Add stock selector above, or click the star icon on any stock in the Screener or Stock Detail page."
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
