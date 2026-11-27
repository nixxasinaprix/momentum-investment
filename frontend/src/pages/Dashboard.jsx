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
import {
  Badge,
  Button,
  DisclaimerBanner,
  EmptyState,
  ErrorState,
  GlassCard,
  PageContainer,
  SkeletonCard,
  SkeletonChart,
  SkeletonTable,
  StatCard,
  TrendBadge,
} from "../components/ui";
import { useCachedApi } from "../hooks/useCachedApi";
import { useChartTheme } from "../lib/chartTheme";
import { formatINR, formatPct, shortSymbol } from "../lib/format";

function MomentumMoverList({ title, subtitle, items, positive, onSelect }) {
  return (
    <GlassCard as="section" padding="p-0" className="overflow-hidden">
      <div className="lab-table-head flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-[var(--text-primary)]">
            {positive ? (
              <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>
        </div>
      </div>

      {!items.length ? (
        <div className="p-6">
          <EmptyState
            title="No stocks ranked"
            description="Insufficient history for ranking."
          />
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-table)]">
          {items.map((item) => (
            <button
              key={item.symbol}
              type="button"
              onClick={() => onSelect(item.symbol)}
              className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-[var(--surface-table-hover)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="plum" size="xs" className="tabular-nums">
                    #{item.rank}
                  </Badge>
                  <span className="font-bold text-[var(--text-primary)]">
                    {shortSymbol(item.symbol)}
                  </span>
                  <TrendBadge trend={item.trend} />
                </div>
                <p className="mt-0.5 truncate pl-1 text-xs text-[var(--text-muted)]">
                  {item.name} · {item.sector}
                </p>
              </div>

              <div className="hidden w-24 sm:block">
                <Sparkline data={item.sparkline} positive={positive} height={30} />
              </div>

              <div className="shrink-0 text-right tabular-nums">
                <div className="text-sm font-extrabold text-[var(--text-primary)]">
                  {item.score !== null ? item.score.toFixed(2) : "—"}
                </div>
                <div
                  className={`text-xs font-bold ${
                    (item.ret_12_1m ?? 0) >= 0
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {formatPct(item.ret_12_1m, 1)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const chart = useChartTheme();
  const { data, loading, error, refetch } = useCachedApi("/api/market/overview");

  const breadthChartData = useMemo(() => {
    if (!data?.breadth_history) return [];
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
        <Button variant="secondary" size="sm" onClick={refetch} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      }
    >
      {loading && !data ? (
        <PageContainer>
          <SkeletonCard count={4} />
          <SkeletonChart height={300} />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SkeletonTable rows={6} cols={4} />
            <SkeletonTable rows={6} cols={4} />
          </div>
        </PageContainer>
      ) : error && !data ? (
        <ErrorState
          title="Could not load market overview"
          message={error}
          onRetry={refetch}
        />
      ) : !data || !summary?.total_stocks ? (
        <EmptyState
          title="No market data found"
          description="Ingest Nifty 200 historical prices to populate the dashboard."
        />
      ) : (
        <PageContainer>
          <DisclaimerBanner />

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
          <GlassCard as="section">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
                  Market Breadth (Trailing 1 Year)
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Percentage of tracked Nifty 200 constituents trading above their 50-day and 200-day moving averages
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="gold" size="md">
                  50DMA: {summary.pct_above_50dma.toFixed(1)}%
                </Badge>
                <Badge variant="plum" size="md">
                  200DMA: {summary.pct_above_200dma.toFixed(1)}%
                </Badge>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={breadthChartData}
                  margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="grad50" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chart.colors.second} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chart.colors.second} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad200" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chart.colors.main} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chart.colors.main} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                  <XAxis
                    dataKey="date"
                    tick={chart.axisTick}
                    axisLine={chart.axisLine}
                    tickLine={false}
                    tickFormatter={(v) => v.slice(2, 7)}
                    minTickGap={28}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={chart.axisTick}
                    axisLine={chart.axisLine}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <ReferenceLine
                    y={50}
                    stroke={chart.referenceLine}
                    strokeDasharray="4 4"
                  />
                  <Tooltip
                    contentStyle={chart.tooltipStyle}
                    labelStyle={chart.tooltipLabelStyle}
                    formatter={(val, name) => [`${Number(val).toFixed(1)}%`, name]}
                  />
                  <Legend wrapperStyle={chart.legendStyle} />
                  <Area
                    type="monotone"
                    dataKey="pct_above_50dma"
                    name="% Above 50DMA"
                    stroke={chart.colors.second}
                    strokeWidth={2}
                    fill="url(#grad50)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="pct_above_200dma"
                    name="% Above 200DMA"
                    stroke={chart.colors.main}
                    strokeWidth={2}
                    fill="url(#grad200)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

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
          <GlassCard as="section">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
                  Sector Momentum Heatmap
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
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
          </GlassCard>
        </PageContainer>
      )}
    </AppLayout>
  );
}
