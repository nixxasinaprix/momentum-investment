import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppLayout from "../components/AppLayout";
import MathFormula from "../components/MathFormula";
import { SkeletonCard, SkeletonChart } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/StateViews";
import StatCard from "../components/StatCard";
import TrendBadge from "../components/TrendBadge";
import { useCachedApi } from "../hooks/useCachedApi";
import { usePipelineParams } from "../context/PipelineContext";
import { useWatchlist } from "../hooks/useWatchlist";
import { formatCompactVolume, formatINR, formatPct, shortSymbol } from "../lib/format";

const RANGES = ["1y", "3y", "5y"];

export default function StockDetail() {
  const { symbol } = useParams();
  const decodedSymbol = decodeURIComponent(symbol || "");
  const { params: pipelineParams } = usePipelineParams();
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
          <Link
            to="/screener"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-stone-200 hover:border-white/30 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Screener
          </Link>
          <button
            type="button"
            onClick={() => toggleWatchlist(decodedSymbol)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              watched
                ? "border-amber-400/50 bg-amber-400/15 text-amber-300"
                : "border-white/15 bg-white/5 text-stone-200 hover:border-amber-400/40"
            }`}
          >
            <Star className="h-3.5 w-3.5" fill={watched ? "currentColor" : "none"} />
            {watched ? "Watchlisted" : "Watchlist"}
          </button>
        </div>
      }
    >
      {loading && !data ? (
        <div className="space-y-6">
          <SkeletonCard count={4} />
          <SkeletonChart height={360} />
          <SkeletonChart height={220} />
        </div>
      ) : error && !data ? (
        <ErrorState title="Could not load stock analysis" message={error} onRetry={refetch} />
      ) : !data || !summary ? (
        <EmptyState title="No analysis available" description="No price bars found for this symbol." />
      ) : (
        <div className="space-y-6">
          {/* Trend verdict banner */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg md:flex-row md:items-center">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-3xl font-bold text-white">
                  {formatINR(summary.last_price)}
                </span>
                <TrendBadge trend={summary.trend} size="md" />
                {summary.rank && (
                  <span className="rounded-full border border-[#F0867C]/35 bg-[#F0867C]/10 px-3 py-1 text-xs font-semibold text-[#F0867C]">
                    Rank #{summary.rank} / {summary.universe_size}
                  </span>
                )}
              </div>
              <p className="max-w-3xl text-sm text-stone-300">
                {summary.trend_explanation}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3 text-xs">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2">
                <div className="text-stone-400">50 DMA</div>
                <div className="mt-0.5 font-semibold text-amber-300">
                  {formatINR(summary.sma_50)}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2">
                <div className="text-stone-400">200 DMA</div>
                <div className="mt-0.5 font-semibold text-fuchsia-300">
                  {formatINR(summary.sma_200)}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2">
                <div className="text-stone-400">RSI(14)</div>
                <div className="mt-0.5 font-semibold text-white">
                  {summary.rsi_14 !== null ? summary.rsi_14.toFixed(1) : "—"}
                </div>
              </div>
            </div>
          </div>

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
          <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  Adjusted Price &amp; Moving Averages
                </h2>
                <p className="text-xs text-stone-400">
                  Corporate-action adjusted close with toggleable 20/50/200-day SMAs
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSma20((v) => !v)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                    showSma20
                      ? "border-sky-400/50 bg-sky-400/15 text-sky-300"
                      : "border-white/10 bg-white/5 text-stone-400"
                  }`}
                >
                  SMA 20
                </button>
                <button
                  type="button"
                  onClick={() => setShowSma50((v) => !v)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                    showSma50
                      ? "border-amber-400/50 bg-amber-400/15 text-amber-300"
                      : "border-white/10 bg-white/5 text-stone-400"
                  }`}
                >
                  SMA 50
                </button>
                <button
                  type="button"
                  onClick={() => setShowSma200((v) => !v)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                    showSma200
                      ? "border-fuchsia-400/50 bg-fuchsia-400/15 text-fuchsia-300"
                      : "border-white/10 bg-white/5 text-stone-400"
                  }`}
                >
                  SMA 200
                </button>

                <div className="ml-2 flex rounded-xl border border-white/10 bg-[#07080F] p-0.5">
                  {RANGES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRange(r)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold uppercase transition ${
                        range === r
                          ? "bg-[#8C4570] text-white"
                          : "text-stone-400 hover:text-white"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F0867C" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#F0867C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#a8a29e", fontSize: 11 }}
                    tickFormatter={(v) => v.slice(2, 7)}
                    minTickGap={30}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fill: "#a8a29e", fontSize: 11 }}
                    tickFormatter={(v) => `₹${Math.round(v)}`}
                    width={64}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#141220",
                      borderColor: "rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(val, name) => [
                      val != null ? formatINR(val) : "—",
                      name,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    name="Close"
                    stroke="#F0867C"
                    strokeWidth={2}
                    fill="url(#priceFill)"
                    dot={false}
                  />
                  {showSma20 && (
                    <Line
                      type="monotone"
                      dataKey="sma_20"
                      name="SMA 20"
                      stroke="#38bdf8"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  )}
                  {showSma50 && (
                    <Line
                      type="monotone"
                      dataKey="sma_50"
                      name="SMA 50"
                      stroke="#fbbf24"
                      strokeWidth={1.75}
                      dot={false}
                    />
                  )}
                  {showSma200 && (
                    <Line
                      type="monotone"
                      dataKey="sma_200"
                      name="SMA 200"
                      stroke="#e879f9"
                      strokeWidth={1.75}
                      dot={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Volume + RSI grid */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
              <h3 className="font-display text-sm font-bold text-white">Daily Volume</h3>
              <p className="mb-3 text-xs text-stone-400">Traded shares across selected range</p>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#a8a29e", fontSize: 10 }}
                      tickFormatter={(v) => v.slice(2, 7)}
                      minTickGap={30}
                    />
                    <YAxis
                      tick={{ fill: "#a8a29e", fontSize: 10 }}
                      tickFormatter={formatCompactVolume}
                      width={52}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#141220",
                        borderColor: "rgba(255,255,255,0.12)",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                      formatter={(val) => [formatCompactVolume(val), "Volume"]}
                    />
                    <Bar dataKey="volume" fill="#8C4570" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
              <h3 className="font-display text-sm font-bold text-white">
                RSI(14) Oscillator
              </h3>
              <p className="mb-3 text-xs text-stone-400">
                Overbought (&gt;70) and oversold (&lt;30) thresholds marked
              </p>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#a8a29e", fontSize: 10 }}
                      tickFormatter={(v) => v.slice(2, 7)}
                      minTickGap={30}
                    />
                    <YAxis domain={[0, 100]} tick={{ fill: "#a8a29e", fontSize: 10 }} />
                    <ReferenceLine y={70} stroke="#fb7185" strokeDasharray="4 4" />
                    <ReferenceLine y={30} stroke="#34d399" strokeDasharray="4 4" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#141220",
                        borderColor: "rgba(255,255,255,0.12)",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                      formatter={(val) => [val != null ? Number(val).toFixed(2) : "—", "RSI(14)"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="rsi_14"
                      stroke="#38bdf8"
                      strokeWidth={1.75}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Rank history + Step-by-step score breakdown */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
              <h3 className="font-display text-base font-bold text-white">
                Momentum Rank History (Monthly)
              </h3>
              <p className="mb-3 text-xs text-stone-400">
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
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#a8a29e", fontSize: 11 }}
                        tickFormatter={(v) => v.slice(2, 7)}
                      />
                      <YAxis
                        reversed
                        domain={[1, "dataMax"]}
                        tick={{ fill: "#a8a29e", fontSize: 11 }}
                        tickFormatter={(v) => `#${v}`}
                      />
                      <ReferenceLine y={20} stroke="#34d399" strokeDasharray="4 4" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#141220",
                          borderColor: "rgba(255,255,255,0.12)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        formatter={(val, name) => [
                          name === "Rank" ? `#${val}` : Number(val).toFixed(3),
                          name,
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="rank"
                        name="Rank"
                        stroke="#F0867C"
                        strokeWidth={2.25}
                        dot={{ r: 3, fill: "#F0867C" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
              <div className="mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-[#F0867C]" />
                <h3 className="font-display text-base font-bold text-white">
                  How This Score Was Calculated
                </h3>
              </div>

              {!breakdown?.eligible ? (
                <EmptyState
                  title="Not eligible for scoring yet"
                  description={breakdown?.reason || "Insufficient price history."}
                />
              ) : (
                <div className="space-y-4 text-sm">
                  <div className="rounded-xl border border-white/10 bg-[#07080F] p-3.5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">
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
                    <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-stone-400">
                      <span>
                        <strong className="text-stone-200">t−{breakdown.lookback_days}</strong> ({breakdown.date_252_ago}):{" "}
                        {formatINR(breakdown.price_252_ago)}
                      </span>
                      <span>
                        <strong className="text-stone-200">t−{breakdown.skip_days}</strong> ({breakdown.date_21_ago}):{" "}
                        {formatINR(breakdown.price_21_ago)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#07080F] p-3.5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                      Step 2 · Annualised Daily Volatility
                    </div>
                    <MathFormula
                      display
                      math={`\\sigma_{\\text{ann}} = \\sigma_{\\text{daily}} \\times \\sqrt{252} = ${(
                        breakdown.volatility_ann * 100
                      ).toFixed(2)}\\%`}
                    />
                  </div>

                  <div className="rounded-xl border border-[#F0867C]/30 bg-[#F0867C]/[0.06] p-3.5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#F0867C]">
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
                    <div className="mt-1 text-xs text-stone-300">
                      Ranks <strong className="text-white">#{breakdown.rank}</strong> out of{" "}
                      <strong className="text-white">{breakdown.universe_size}</strong> eligible Nifty 200 stocks as of{" "}
                      {breakdown.as_of}.
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
