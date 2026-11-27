import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, Calculator, Star } from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppLayout from "../components/AppLayout";
import MathFormula from "../components/MathFormula";
import {
  Badge,
  Button,
  Card,
  DisclaimerBanner,
  EmptyState,
  ErrorState,
  GlassCard,
  PageContainer,
  SegmentedControl,
  SkeletonCard,
  SkeletonChart,
  StatCard,
  Tooltip,
  TrendBadge,
} from "../components/ui";
import { useCachedApi } from "../hooks/useCachedApi";
import { usePipelineParams } from "../context/PipelineContext";
import { useWatchlist } from "../hooks/useWatchlist";
import { useChartTheme } from "../lib/chartTheme";
import { formatCompactVolume, formatINR, formatPct, shortSymbol } from "../lib/format";

const RANGES = [
  { value: "1y", label: "1Y" },
  { value: "3y", label: "3Y" },
  { value: "5y", label: "5Y" },
];

export default function StockDetail() {
  const { symbol } = useParams();
  const decodedSymbol = decodeURIComponent(symbol || "");
  const { params: pipelineParams } = usePipelineParams();
  const chart = useChartTheme();
  const [range, setRange] = useState("1y");
  const [showSma20, setShowSma20] = useState(false);
  const [showSma50, setShowSma50] = useState(true);
  const [showSma200, setShowSma200] = useState(true);

  const { isWatched, toggleWatchlist } = useWatchlist();
  const { data, loading, error, refetch } = useCachedApi(
    `/api/stocks/${encodeURIComponent(decodedSymbol)}/analysis?range=${range}&lookback=${pipelineParams.lookback_days}&skip=${Math.min(pipelineParams.skip_days, pipelineParams.lookback_days - 1)}`,
    { enabled: Boolean(decodedSymbol) }
  );

  const series = useMemo(() => data?.series || [], [data]);
  const summary = data?.summary;
  const breakdown = data?.score_breakdown;
  const watched = isWatched(decodedSymbol);

  return (
    <AppLayout
      title={data ? `${shortSymbol(data.stock.symbol)} · ${data.stock.name}` : shortSymbol(decodedSymbol)}
      subtitle={data ? `${data.stock.sector || "NSE"} · As of ${data.as_of}` : "Loading security analysis"}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" to="/screener">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Screener</span>
          </Button>
          <Button
            variant={watched ? "primary" : "secondary"}
            size="sm"
            onClick={() => toggleWatchlist(decodedSymbol)}
            className={
              watched
                ? "border border-brand-gold bg-brand-gold text-[#3B1F4E] shadow-md shadow-brand-gold/30 hover:brightness-105 dark:border-brand-gold dark:bg-brand-gold dark:text-[#3B1F4E]"
                : ""
            }
          >
            <Star className="h-3.5 w-3.5" fill={watched ? "currentColor" : "none"} />
            <span>{watched ? "Watchlisted" : "Watchlist"}</span>
          </Button>
        </div>
      }
    >
      {loading && !data ? (
        <PageContainer>
          <SkeletonCard count={4} />
          <SkeletonChart height={360} />
          <SkeletonChart height={220} />
        </PageContainer>
      ) : error && !data ? (
        <ErrorState
          title="Could not load stock analysis"
          message={error}
          onRetry={refetch}
        />
      ) : !data || !summary ? (
        <EmptyState
          title="No analysis available"
          description="No price bars found for this symbol."
        />
      ) : (
        <PageContainer>
          <DisclaimerBanner />

          {/* Trend verdict hero card with soft corner blob */}
          <GlassCard className="relative flex flex-col justify-between gap-4 overflow-hidden md:flex-row md:items-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-brand-coral/20 blur-xl"
            />
            <div className="relative z-10 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-3xl font-extrabold tabular-nums text-[var(--text-primary)]">
                  {formatINR(summary.last_price)}
                </span>
                <TrendBadge trend={summary.trend} size="md" />
                {summary.rank && (
                  <Badge variant="plum" size="md">
                    Rank #{summary.rank} / {summary.universe_size}
                  </Badge>
                )}
              </div>
              <p className="max-w-3xl text-sm text-[var(--text-secondary)]">
                {summary.trend_explanation}
              </p>
            </div>

            <div className="relative z-10 flex shrink-0 flex-wrap gap-3 text-xs">
              <Card variant="well" padding="px-3.5 py-2">
                <div className="text-[var(--text-muted)]">50 DMA</div>
                <div className="mt-0.5 font-bold tabular-nums text-amber-700 dark:text-brand-gold">
                  {formatINR(summary.sma_50)}
                </div>
              </Card>
              <Card variant="well" padding="px-3.5 py-2">
                <div className="text-[var(--text-muted)]">200 DMA</div>
                <div className="mt-0.5 font-bold tabular-nums text-brand-plum dark:text-brand-mauve">
                  {formatINR(summary.sma_200)}
                </div>
              </Card>
              <Card variant="well" padding="px-3.5 py-2">
                <div className="text-[var(--text-muted)]">RSI(14)</div>
                <div className="mt-0.5 font-bold tabular-nums text-[var(--text-primary)]">
                  {summary.rsi_14 !== null ? summary.rsi_14.toFixed(1) : "—"}
                </div>
              </Card>
            </div>
          </GlassCard>

          {/* Key stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="12-1M Momentum"
              value={formatPct(summary.ret_12_1m, 2)}
              subtext={`1M ${formatPct(summary.ret_1m, 1)} · 3M ${formatPct(summary.ret_3m, 1)} · 6M ${formatPct(summary.ret_6m, 1)}`}
              accent={(summary.ret_12_1m ?? 0) >= 0 ? "emerald" : "rose"}
            />
            <StatCard
              label="Annualised Volatility"
              value={
                summary.volatility !== null
                  ? `${(summary.volatility * 100).toFixed(2)}%`
                  : "—"
              }
              subtext={
                summary.score !== null
                  ? `Vol-adjusted score: ${summary.score.toFixed(3)}`
                  : "Insufficient history for score"
              }
              accent="plum"
            />
            <StatCard
              label="Distance from 52W High"
              value={
                summary.pct_below_52w_high !== null
                  ? `-${summary.pct_below_52w_high.toFixed(2)}%`
                  : "—"
              }
              subtext={`52W Range: ${formatINR(summary.low_52w)} – ${formatINR(summary.high_52w)}`}
              accent="amber"
            />
            <StatCard
              label="Universe Rank"
              value={summary.rank ? `#${summary.rank}` : "Unranked"}
              subtext={
                summary.rank
                  ? `Out of ${summary.universe_size} eligible Nifty 200 stocks`
                  : "Requires 273+ prior trading days"
              }
            />
          </div>

          {/* Main Price + SMA Chart */}
          <GlassCard as="section">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
                  Adjusted Price &amp; Moving Averages
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Corporate-action adjusted close with toggleable 20/50/200-day SMAs
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSma20((v) => !v)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold transition ${
                    showSma20
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200"
                      : "lab-well text-[var(--text-muted)]"
                  }`}
                >
                  SMA 20
                </button>
                <button
                  type="button"
                  onClick={() => setShowSma50((v) => !v)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold transition ${
                    showSma50
                      ? "border-brand-gold/80 bg-brand-gold/30 text-[#3B1F4E] dark:border-brand-gold/45 dark:bg-brand-gold/20 dark:text-brand-gold"
                      : "lab-well text-[var(--text-muted)]"
                  }`}
                >
                  SMA 50
                </button>
                <button
                  type="button"
                  onClick={() => setShowSma200((v) => !v)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold transition ${
                    showSma200
                      ? "border-brand-mauve/55 bg-brand-mauve/20 text-[#3B1F4E] dark:border-brand-mauve/45 dark:bg-brand-mauve/25 dark:text-brand-mauve"
                      : "lab-well text-[var(--text-muted)]"
                  }`}
                >
                  SMA 200
                </button>

                <SegmentedControl
                  size="xs"
                  value={range}
                  onChange={setRange}
                  options={RANGES}
                  className="ml-1"
                />
              </div>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
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
                    minTickGap={30}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={chart.axisTick}
                    axisLine={chart.axisLine}
                    tickLine={false}
                    tickFormatter={(v) => `₹${Math.round(v)}`}
                    width={64}
                  />
                  <RechartsTooltip
                    contentStyle={chart.tooltipStyle}
                    labelStyle={chart.tooltipLabelStyle}
                    formatter={(val, name) => [
                      val != null ? formatINR(val) : "—",
                      name,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    name="Close"
                    stroke={chart.colors.main}
                    strokeWidth={2}
                    fill="url(#priceFill)"
                    dot={false}
                    isAnimationActive={false}
                  />
                  {showSma20 && (
                    <Line
                      type="monotone"
                      dataKey="sma_20"
                      name="SMA 20"
                      stroke={chart.colors.positive}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                  {showSma50 && (
                    <Line
                      type="monotone"
                      dataKey="sma_50"
                      name="SMA 50"
                      stroke={chart.colors.second}
                      strokeWidth={1.85}
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                  {showSma200 && (
                    <Line
                      type="monotone"
                      dataKey="sma_200"
                      name="SMA 200"
                      stroke={chart.colors.third}
                      strokeWidth={1.85}
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Volume + RSI grid */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <GlassCard as="section">
              <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
                Daily Volume
              </h3>
              <p className="mb-3 text-xs text-[var(--text-muted)]">
                Traded shares across selected range
              </p>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                    <XAxis
                      dataKey="date"
                      tick={chart.axisTickSm}
                      axisLine={chart.axisLine}
                      tickLine={false}
                      tickFormatter={(v) => v.slice(2, 7)}
                      minTickGap={30}
                    />
                    <YAxis
                      tick={chart.axisTickSm}
                      axisLine={chart.axisLine}
                      tickLine={false}
                      tickFormatter={formatCompactVolume}
                      width={52}
                    />
                    <RechartsTooltip
                      contentStyle={chart.tooltipStyle}
                      labelStyle={chart.tooltipLabelStyle}
                      formatter={(val) => [formatCompactVolume(val), "Volume"]}
                    />
                    <Bar
                      dataKey="volume"
                      fill={chart.colors.third}
                      radius={[2, 2, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard as="section">
              <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
                RSI(14) Oscillator
              </h3>
              <p className="mb-3 text-xs text-[var(--text-muted)]">
                Overbought (&gt;70) and oversold (&lt;30) thresholds marked
              </p>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                    <XAxis
                      dataKey="date"
                      tick={chart.axisTickSm}
                      axisLine={chart.axisLine}
                      tickLine={false}
                      tickFormatter={(v) => v.slice(2, 7)}
                      minTickGap={30}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={chart.axisTickSm}
                      axisLine={chart.axisLine}
                      tickLine={false}
                    />
                    <ReferenceLine y={70} stroke={chart.colors.negative} strokeDasharray="4 4" />
                    <ReferenceLine y={30} stroke={chart.colors.positive} strokeDasharray="4 4" />
                    <RechartsTooltip
                      contentStyle={chart.tooltipStyle}
                      labelStyle={chart.tooltipLabelStyle}
                      formatter={(val) => [
                        val != null ? Number(val).toFixed(2) : "—",
                        "RSI(14)",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="rsi_14"
                      stroke={chart.colors.main}
                      strokeWidth={1.75}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* Rank history + Step-by-step score breakdown */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <GlassCard as="section">
              <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                Momentum Rank History (Monthly)
              </h3>
              <p className="mb-3 text-xs text-[var(--text-muted)]">
                Cross-sectional Nifty 200 rank at each month-end (#1 = strongest at top)
              </p>
              {!data.rank_history?.length ? (
                <EmptyState
                  title="No monthly rank history"
                  description="Stock requires at least 273 prior trading days to enter monthly rankings."
                />
              ) : (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.rank_history}
                      margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                      <XAxis
                        dataKey="date"
                        tick={chart.axisTick}
                        axisLine={chart.axisLine}
                        tickLine={false}
                        tickFormatter={(v) => v.slice(2, 7)}
                      />
                      <YAxis
                        reversed
                        domain={[1, "dataMax"]}
                        tick={chart.axisTick}
                        axisLine={chart.axisLine}
                        tickLine={false}
                        tickFormatter={(v) => `#${v}`}
                      />
                      <ReferenceLine y={20} stroke={chart.colors.positive} strokeDasharray="4 4" />
                      <RechartsTooltip
                        contentStyle={chart.tooltipStyle}
                        labelStyle={chart.tooltipLabelStyle}
                        formatter={(val, name) => [
                          name === "Rank" ? `#${val}` : Number(val).toFixed(3),
                          name,
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="rank"
                        name="Rank"
                        stroke={chart.colors.main}
                        strokeWidth={2.25}
                        dot={{ r: 3, fill: chart.colors.main }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlassCard>

            <GlassCard as="section">
              <div className="mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-brand-plum dark:text-brand-coral" />
                <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                  How This Score Was Calculated
                </h3>
                <Tooltip content="Uses only adjusted closing prices up to the selected as-of date (zero look-ahead)." />
              </div>

              {!breakdown?.eligible ? (
                <EmptyState
                  title="Not eligible for scoring yet"
                  description={breakdown?.reason || "Insufficient price history."}
                />
              ) : (
                <div className="space-y-4 text-sm">
                  <Card variant="well" padding="p-3.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Step 1 · Momentum Return ({breakdown.lookback_days}d − {breakdown.skip_days}d)
                    </div>
                    <MathFormula
                      display
                      math={`R = \\frac{P_{t-${breakdown.skip_days}}}{P_{t-${breakdown.lookback_days}}} - 1 = \\frac{${breakdown.price_21_ago.toFixed(
                        2
                      )}}{${breakdown.price_252_ago.toFixed(
                        2
                      )}} - 1 = ${(breakdown.momentum_12_1 * 100).toFixed(2)}\\%`}
                    />
                    <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-[var(--text-muted)]">
                      <span>
                        <strong className="text-[var(--text-primary)]">
                          t−{breakdown.lookback_days}
                        </strong>{" "}
                        ({breakdown.date_252_ago}): {formatINR(breakdown.price_252_ago)}
                      </span>
                      <span>
                        <strong className="text-[var(--text-primary)]">
                          t−{breakdown.skip_days}
                        </strong>{" "}
                        ({breakdown.date_21_ago}): {formatINR(breakdown.price_21_ago)}
                      </span>
                    </div>
                  </Card>

                  <Card variant="well" padding="p-3.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Step 2 · Annualised Daily Volatility
                    </div>
                    <MathFormula
                      display
                      math={`\\sigma_{\\text{ann}} = \\sigma_{\\text{daily}} \\times \\sqrt{252} = ${(
                        breakdown.volatility_ann * 100
                      ).toFixed(2)}\\%`}
                    />
                  </Card>

                  <Card variant="accent" padding="p-3.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-brand-plum dark:text-brand-coral">
                      Step 3 · Volatility-Adjusted Score &amp; Rank
                    </div>
                    <MathFormula
                      display
                      math={`\\text{Score} = \\frac{R_{12-1}}{\\sigma_{\\text{ann}}} = \\frac{${breakdown.momentum_12_1.toFixed(
                        4
                      )}}{${breakdown.volatility_ann.toFixed(
                        4
                      )}} = ${breakdown.score.toFixed(4)}`}
                    />
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">
                      Ranks{" "}
                      <strong className="text-[var(--text-primary)]">
                        #{breakdown.rank}
                      </strong>{" "}
                      out of{" "}
                      <strong className="text-[var(--text-primary)]">
                        {breakdown.universe_size}
                      </strong>{" "}
                      eligible Nifty 200 stocks as of {breakdown.as_of}.
                    </div>
                  </Card>
                </div>
              )}
            </GlassCard>
          </div>
        </PageContainer>
      )}
    </AppLayout>
  );
}
