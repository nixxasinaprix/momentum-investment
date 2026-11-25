import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, Filter, Play, RotateCcw, SlidersHorizontal } from "lucide-react";
import AppLayout from "../components/AppLayout";
import MathFormula from "../components/MathFormula";
import PipelineFunnel from "../components/PipelineFunnel";
import { SkeletonCard } from "../components/Skeleton";
import { ErrorState } from "../components/StateViews";
import { useAuth } from "../context/AuthContext";
import { usePipelineParams } from "../context/PipelineContext";
import { DEFAULT_PIPELINE_PARAMS } from "../lib/pipelineDefaults";
import { api } from "../lib/api";
import { shortSymbol } from "../lib/format";

export default function StrategyLab() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { params, setParams, resetParams } = usePipelineParams();

  const [draft, setDraft] = useState(params);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      api("/api/pipeline/run", {
        method: "POST",
        body: draft,
        token,
      })
        .then((res) => {
          if (active) {
            setPreview(res);
            setError(null);
          }
        })
        .catch((err) => {
          if (active) setError(err.message || "Preview failed");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [draft, token]);

  const toggleSectorExclusion = (sector) => {
    setDraft((prev) => {
      const exists = prev.excluded_sectors.includes(sector);
      return {
        ...prev,
        excluded_sectors: exists
          ? prev.excluded_sectors.filter((s) => s !== sector)
          : [...prev.excluded_sectors, sector],
      };
    });
  };

  const handleRunAndOpenPicks = () => {
    setParams(draft);
    navigate("/picks");
  };

  const handleReset = () => {
    resetParams();
    setDraft(DEFAULT_PIPELINE_PARAMS);
  };

  const effectiveSkip = Math.min(draft.skip_days, draft.lookback_days - 1);

  const filterFormula = useMemo(() => {
    const parts = [];
    if (draft.min_market_cap_cr > 0) parts.push(`\\text{MCap} \\ge ${draft.min_market_cap_cr}\\text{Cr}`);
    if (draft.min_price > 0) parts.push(`P_t \\ge \\text{₹}${draft.min_price}`);
    if (draft.min_avg_traded_value_cr > 0) parts.push(`\\overline{P\\cdot V}_{20} \\ge ${draft.min_avg_traded_value_cr}\\text{Cr}`);
    if (draft.above_200dma) parts.push(`P_t > \\text{SMA}_{200}`);
    if (draft.max_pct_below_52w_high !== null && draft.max_pct_below_52w_high < 100) {
      parts.push(`\\frac{P_t}{H_{52w}} \\ge ${(1 - draft.max_pct_below_52w_high / 100).toFixed(2)}`);
    }
    return parts.length ? parts.join(",\\; ") : "\\text{All active Nifty 500 stocks eligible}";
  }, [draft]);

  const scoreFormula = useMemo(() => {
    if (draft.method === "vol_adjusted") {
      return `\\text{Score}_i = \\frac{P_{t-${effectiveSkip}}/P_{t-${draft.lookback_days}} - 1}{\\sigma_{\\text{ann}, ${draft.lookback_days}}(i)}, \\quad w_i = \\frac{1}{${draft.top_n}}`;
    }
    if (draft.method === "zscore_blend") {
      return `\\text{Score}_i = 0.5\\,z(R_{6\\text{M}}) + 0.5\\,z(R_{${draft.lookback_days}-${effectiveSkip}}), \\quad w_i = \\frac{1}{${draft.top_n}}`;
    }
    return `\\text{Score}_i = \\frac{P_{t-${effectiveSkip}}}{P_{t-${draft.lookback_days}}} - 1, \\quad w_i = \\frac{1}{${draft.top_n}}`;
  }, [draft.method, draft.lookback_days, effectiveSkip, draft.top_n]);

  const availableSectors = preview?.sectors_available || [];

  return (
    <AppLayout
      title="Strategy Builder"
      subtitle="Configure quality filters, momentum formula, and portfolio rules — then run Today's Picks"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-stone-200 hover:border-white/30"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Defaults
          </button>
          <button
            type="button"
            onClick={() => {
              setParams(draft);
              navigate("/backtest?autorun=1");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:border-[#F0867C]/50"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Backtest
          </button>
          <button
            type="button"
            onClick={handleRunAndOpenPicks}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#8C4570] to-[#F0867C] px-4 py-1.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110"
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            Run &amp; Open Today&apos;s Picks
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Funnel Visual */}
        {loading && !preview ? (
          <SkeletonCard count={4} />
        ) : error ? (
          <ErrorState title="Pipeline preview error" message={error} />
        ) : (
          <PipelineFunnel stages={preview?.stages || []} />
        )}

        {/* Section 1: Quality Filters */}
        <section className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#F0867C]" />
            <h2 className="font-display text-base font-bold text-white">
              1. Quality &amp; Liquidity Filters
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-[#07080F] p-4">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-white">Min Market Cap</span>
                <span className="font-bold text-[#F0867C]">
                  {draft.min_market_cap_cr > 0
                    ? `₹${draft.min_market_cap_cr.toLocaleString("en-IN")} Cr`
                    : "Off"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={50000}
                step={500}
                value={draft.min_market_cap_cr}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, min_market_cap_cr: Number(e.target.value) }))
                }
                className="mt-2 h-1.5 w-full cursor-pointer accent-[#F0867C]"
              />
              <p className="mt-1.5 text-[11px] text-stone-400">
                Removes smaller, higher-volatility companies below this market capitalization.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#07080F] p-4">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-white">Min 20D Avg Traded Value</span>
                <span className="font-bold text-[#F0867C]">
                  {draft.min_avg_traded_value_cr > 0
                    ? `₹${draft.min_avg_traded_value_cr} Cr/day`
                    : "Off"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={draft.min_avg_traded_value_cr}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, min_avg_traded_value_cr: Number(e.target.value) }))
                }
                className="mt-2 h-1.5 w-full cursor-pointer accent-[#F0867C]"
              />
              <p className="mt-1.5 text-[11px] text-stone-400">
                Ensures sufficient daily liquidity (close × volume) so entries/exits have lower slippage.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#07080F] p-4">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-white">Minimum Share Price</span>
                <span className="font-bold text-[#F0867C]">
                  {draft.min_price > 0 ? `₹${draft.min_price}` : "Off"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={500}
                step={10}
                value={draft.min_price}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, min_price: Number(e.target.value) }))
                }
                className="mt-2 h-1.5 w-full cursor-pointer accent-[#F0867C]"
              />
              <p className="mt-1.5 text-[11px] text-stone-400">
                Avoids low-priced stocks where tick sizes create disproportionate percentage swings.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#07080F] p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Within % of 52-Week High</span>
                <span className="font-bold text-[#F0867C]">
                  {draft.max_pct_below_52w_high !== null && draft.max_pct_below_52w_high < 100
                    ? `≤ ${draft.max_pct_below_52w_high}%`
                    : "Disabled"}
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={draft.max_pct_below_52w_high ?? 100}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDraft((p) => ({
                    ...p,
                    max_pct_below_52w_high: val >= 100 ? null : val,
                  }));
                }}
                className="mt-2 h-1.5 w-full cursor-pointer accent-[#F0867C]"
              />
              <p className="mt-1.5 text-[11px] text-stone-400">
                Keeps only leaders trading near their 52-week peak (100% disables this rule).
              </p>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#07080F] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Price Above 200-Day SMA</span>
                <button
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, above_200dma: !p.above_200dma }))}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    draft.above_200dma
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-white/5 text-stone-400 border border-white/10"
                  }`}
                >
                  {draft.above_200dma ? "Enabled" : "Off"}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-stone-400">
                Requires long-term trend confirmation so rebounding bear-market stocks are excluded.
              </p>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#07080F] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white">Unknown Market Cap</span>
                <div className="flex rounded-lg border border-white/10 bg-[#12131F] p-0.5 text-[11px]">
                  {["exclude", "include"].map((pol) => (
                    <button
                      key={pol}
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, unknown_mcap_policy: pol }))}
                      className={`rounded-md px-2.5 py-1 font-semibold capitalize ${
                        draft.unknown_mcap_policy === pol
                          ? "bg-[#8C4570] text-white"
                          : "text-stone-400"
                      }`}
                    >
                      {pol}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-[11px] text-stone-400">
                Controls whether stocks missing a cached yfinance market cap are excluded or kept.
              </p>
            </div>
          </div>

          {availableSectors.length > 0 && (
            <div className="mt-4 rounded-xl border border-white/10 bg-[#07080F] p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-white">
                  Sector Exclusions ({draft.excluded_sectors.length} excluded)
                </span>
                {draft.excluded_sectors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, excluded_sectors: [] }))}
                    className="text-[#F0867C] hover:underline"
                  >
                    Clear exclusions
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableSectors.map((sec) => {
                  const excluded = draft.excluded_sectors.includes(sec);
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => toggleSectorExclusion(sec)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                        excluded
                          ? "border-rose-500/40 bg-rose-500/15 text-rose-300 line-through"
                          : "border-white/10 bg-white/[0.03] text-stone-300 hover:border-white/25"
                      }`}
                    >
                      {sec}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Section 2 & 3: Momentum + Portfolio + KaTeX Live Math */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="space-y-4 rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg xl:col-span-7">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#F0867C]" />
              <h2 className="font-display text-base font-bold text-white">
                2. Momentum &amp; Portfolio Settings
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#07080F] p-4 sm:col-span-2">
                <span className="text-xs font-semibold text-white">Scoring Method</span>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    { id: "vol_adjusted", label: "Vol-Adjusted (12-1M / σ)" },
                    { id: "raw", label: "Raw 12-1M Return" },
                    { id: "zscore_blend", label: "6M + 12M Z-Score Blend" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, method: m.id }))}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        draft.method === m.id
                          ? "border-[#F0867C]/50 bg-[#8C4570]/45 text-white"
                          : "border-white/10 bg-white/[0.03] text-stone-400 hover:text-white"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-stone-400">
                  Vol-adjusted favors steady compounders; Z-score blend combines 6-month and 12-month cross-sectional ranks.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#07080F] p-4">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">Lookback Horizon</span>
                  <span className="font-bold text-[#F0867C]">{draft.lookback_days}d</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={504}
                  value={draft.lookback_days}
                  onChange={(e) => {
                    const lb = Number(e.target.value);
                    setDraft((p) => ({
                      ...p,
                      lookback_days: lb,
                      skip_days: Math.min(p.skip_days, lb - 1),
                      min_history_days: Math.max(p.min_history_days, lb + Math.min(p.skip_days, lb - 1)),
                    }));
                  }}
                  className="mt-2 h-1.5 w-full cursor-pointer accent-[#F0867C]"
                />
                <p className="mt-1.5 text-[11px] text-stone-400">
                  Trading days in the return lookback (252 ≈ 12 months).
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#07080F] p-4">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">Skip Recent Days</span>
                  <span className="font-bold text-[#F0867C]">{effectiveSkip}d</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.min(63, draft.lookback_days - 1)}
                  value={effectiveSkip}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, skip_days: Number(e.target.value) }))
                  }
                  className="mt-2 h-1.5 w-full cursor-pointer accent-[#F0867C]"
                />
                <p className="mt-1.5 text-[11px] text-stone-400">
                  Skips the latest month (21d) to avoid short-term reversal noise.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#07080F] p-4 sm:col-span-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">Portfolio Holdings (Top N)</span>
                  <span className="font-bold text-[#F0867C]">
                    {draft.top_n} stocks ({(100 / draft.top_n).toFixed(2)}% each)
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  value={draft.top_n}
                  onChange={(e) => setDraft((p) => ({ ...p, top_n: Number(e.target.value) }))}
                  className="mt-2 h-1.5 w-full cursor-pointer accent-[#F0867C]"
                />
                <p className="mt-1.5 text-[11px] text-stone-400">
                  Fewer stocks concentrate conviction; more stocks diversify idiosyncratic single-name risk.
                </p>
              </div>
            </div>
          </section>

          {/* Live KaTeX & Preview Top 5 */}
          <section className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg xl:col-span-5">
            <div className="space-y-3">
              <h2 className="font-display text-base font-bold text-white">
                Live Pipeline Equations
              </h2>
              <div className="rounded-xl border border-white/10 bg-[#07080F] p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  Eligibility Gate
                </div>
                <MathFormula display math={filterFormula} />
              </div>
              <div className="rounded-xl border border-white/10 bg-[#07080F] p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  Ranking Score &amp; Weight
                </div>
                <MathFormula display math={scoreFormula} />
              </div>
            </div>

            {preview?.selected?.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-[#07080F] p-3.5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">
                    Live Top 5 Preview ({preview.as_of})
                  </span>
                  {loading && <span className="text-[#F0867C]">Updating…</span>}
                </div>
                <div className="space-y-1.5 text-xs">
                  {preview.selected.slice(0, 5).map((s) => (
                    <div key={s.symbol} className="flex items-center justify-between">
                      <span className="text-stone-200">
                        <strong className="text-[#F0867C]">#{s.rank}</strong> {shortSymbol(s.symbol)}
                      </span>
                      <span className="tabular-nums text-stone-400">
                        Score {s.score != null ? s.score.toFixed(2) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleRunAndOpenPicks}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8C4570] to-[#F0867C] px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
            >
              Run Pipeline &amp; View Today&apos;s Picks
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
