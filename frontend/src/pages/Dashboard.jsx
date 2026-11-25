import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Layers,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppLayout from "../components/AppLayout";
import SectorHeatmap from "../components/SectorHeatmap";
import Sparkline from "../components/Sparkline";
import StatCard from "../components/StatCard";
import { SkeletonCard, SkeletonChart, SkeletonTable } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/StateViews";
import TrendBadge from "../components/TrendBadge";
import { useCachedApi } from "../hooks/useCachedApi";
import { formatINR, formatPct, shortSymbol } from "../lib/format";

function MomentumMoverList({ title, subtitle, items, positive, onSelect }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 shadow-lg">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-white">
            {positive ? (
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-rose-400" />
            )}
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-stone-400">{subtitle}</p>
        </div>
      </div>

      {!items.length ? (
        <div className="p-6">
          <EmptyState title="No stocks ranked" description="Insufficient history for ranking." />
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {items.map((item) => (
            <button
              key={item.symbol}
              type="button"
              onClick={() => onSelect(item.symbol)}
              className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.04]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-xs font-semibold tabular-nums text-stone-500">
                    #{item.rank}
                  </span>
                  <span className="font-semibold text-white">
                    {shortSymbol(item.symbol)}
                  </span>
                  <TrendBadge trend={item.trend} />
                </div>
                <p className="mt-0.5 truncate pl-8 text-xs text-stone-400">
                  {item.name} · {item.sector}
                </p>
              </div>

              <div className="hidden w-24 sm:block">
                <Sparkline data={item.sparkline} positive={positive} height={30} />
              </div>

              <div className="shrink-0 text-right tabular-nums">
                <div className="text-sm font-bold text-white">
                  {item.score !== null ? item.score.toFixed(2) : "—"}
                </div>
                <div
                  className={`text-xs font-medium ${
                    (item.ret_12_1m ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {formatPct(item.ret_12_1m, 1)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useCachedApi("/api/market/overview");

  const breadthChartData = useMemo(() => {
    if (!data?.breadth_history) return [];
    // Downsample slightly if > 130 points for crisp rendering
    const src = data.breadth_history;
    if (src.length <= 130) return src;
    const step = Math.ceil(src.length / 130);
    return src.filter((_, i) => i % step === 0 || i === src.length - 1);
  }, [data]);

  const summary = data?.summary;

  return (
    <AppLayout
      title="Market Overview"
      subtitle={
        data?.as_of
          ? `Nifty 200 momentum cross-section as of ${data.as_of}`
          : "Nifty 200 quantitative momentum & breadth dashboard"
      }
      actions={
        <button
          type="button"
          onClick={refetch}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-stone-200 transition hover:border-[#F0867C]/50 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      }
    >
      {loading && !data ? (
        <div className="space-y-6">
          <SkeletonCard count={4} />
          <SkeletonChart height={300} />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SkeletonTable rows={6} cols={4} />
            <SkeletonTable rows={6} cols={4} />
          </div>
        </div>
      ) : error && !data ? (
        <ErrorState title="Could not load market overview" message={error} onRetry={refetch} />
      ) : !data || !summary?.total_stocks ? (
        <EmptyState
          title="No market data found"
          description="Ingest Nifty 200 historical prices to populate the dashboard."
        />
      ) : (
        <div className="space-y-6">
          {/* KPI stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Stocks Tracked"
              value={summary.total_stocks}
              subtext={`${summary.eligible_stocks} eligible for 12-1M scoring`}
              icon={Layers}
              accent="default"
              onClick={() => navigate("/screener")}
            />
            <StatCard
              label="Above 200DMA"
              value={`${summary.pct_above_200dma.toFixed(1)}%`}
              subtext={`${summary.pct_above_50dma.toFixed(1)}% trading above 50DMA`}
              icon={Activity}
              accent={summary.pct_above_200dma >= 50 ? "emerald" : "rose"}
            />
            <StatCard
              label="Top Sector"
              value={summary.top_sector?.sector || "—"}
              subtext={
                summary.top_sector
                  ? `Avg score ${summary.top_sector.avg_score?.toFixed(2)} · 12-1M ${formatPct(
                      summary.top_sector.avg_momentum,
                      1
                    )}`
                  : "No sector data"
              }
              icon={TrendingUp}
              accent="plum"
              onClick={
                summary.top_sector
                  ? () =>
                      navigate(
                        `/screener?sector=${encodeURIComponent(summary.top_sector.sector)}`
                      )
                  : undefined
              }
            />
            <StatCard
              label="Strongest Stock"
              value={
                summary.strongest_stock
                  ? shortSymbol(summary.strongest_stock.symbol)
                  : "—"
              }
              subtext={
                summary.strongest_stock
                  ? `${formatINR(summary.strongest_stock.last_price)} · Score ${summary.strongest_stock.score?.toFixed(
                      2
                    )} (${formatPct(summary.strongest_stock.ret_12_1m, 1)})`
                  : "No ranked stocks"
              }
              icon={Award}
              accent="amber"
              onClick={
                summary.strongest_stock
                  ? () =>
                      navigate(
                        `/stock/${encodeURIComponent(summary.strongest_stock.symbol)}`
                      )
                  : undefined
              }
            />
          </div>

          {/* Market breadth chart */}
          <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  Market Breadth (Trailing 1 Year)
                </h2>
                <p className="text-xs text-stone-400">
                  Percentage of tracked Nifty 200 constituents trading above their 50-day and 200-day moving averages
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                  50DMA: {summary.pct_above_50dma.toFixed(1)}%
                </span>
                <span className="rounded-lg border border-[#F0867C]/30 bg-[#F0867C]/10 px-2.5 py-1 text-[#F0867C]">
                  200DMA: {summary.pct_above_200dma.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={breadthChartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad50" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad200" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F0867C" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#F0867C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#a8a29e", fontSize: 11 }}
                    tickFormatter={(v) => v.slice(2, 7)}
                    minTickGap={28}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#a8a29e", fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <ReferenceLine y={50} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#141220",
                      borderColor: "rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(val, name) => [`${Number(val).toFixed(1)}%`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Area
                    type="monotone"
                    dataKey="pct_above_50dma"
                    name="% Above 50DMA"
                    stroke="#34d399"
                    strokeWidth={2}
                    fill="url(#grad50)"
                  />
                  <Area
                    type="monotone"
                    dataKey="pct_above_200dma"
                    name="% Above 200DMA"
                    stroke="#F0867C"
                    strokeWidth={2}
                    fill="url(#grad200)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Top 10 & Bottom 10 momentum */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <MomentumMoverList
              title="Top 10 Momentum Leaders"
              subtitle="Highest volatility-adjusted 12-1M momentum scores"
              items={data.top_10 || []}
              positive={true}
              onSelect={(sym) => navigate(`/stock/${encodeURIComponent(sym)}`)}
            />
            <MomentumMoverList
              title="Bottom 10 Laggards"
              subtitle="Weakest volatility-adjusted 12-1M momentum scores"
              items={data.bottom_10 || []}
              positive={false}
              onSelect={(sym) => navigate(`/stock/${encodeURIComponent(sym)}`)}
            />
          </div>

          {/* Sector heatmap */}
          <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  Sector Momentum Heatmap
                </h2>
                <p className="text-xs text-stone-400">
                  Click any sector tile to filter the Screener by that industry
                </p>
              </div>
            </div>
            <SectorHeatmap
              sectors={data.sectors || []}
              onSelectSector={(sec) =>
                navigate(`/screener?sector=${encodeURIComponent(sec)}`)
              }
            />
          </section>
        </div>
      )}
    </AppLayout>
  );
}
