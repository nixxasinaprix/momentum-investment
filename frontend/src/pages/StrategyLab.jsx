import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Filter,
  Play,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import MathFormula from "../components/MathFormula";
import PipelineFunnel from "../components/PipelineFunnel";
import {
  Button,
  Card,
  ErrorState,
  GlassCard,
  PageContainer,
  SegmentedControl,
  SkeletonCard,
  Slider,
  Toggle,
} from "../components/ui";
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
          <Button variant="secondary" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Defaults</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setParams(draft);
              navigate("/backtest?autorun=1");
            }}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Backtest</span>
          </Button>
          <Button variant="primary" size="sm" onClick={handleRunAndOpenPicks}>
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            <span>Run &amp; Open Today&apos;s Picks</span>
          </Button>
        </div>
      }
    >
      <PageContainer>
        {/* Funnel Visual */}
        {loading && !preview ? (
          <SkeletonCard count={4} />
        ) : error ? (
          <ErrorState title="Pipeline preview error" message={error} />
        ) : (
          <PipelineFunnel stages={preview?.stages || []} />
        )}

        {/* Section 1: Quality Filters */}
        <GlassCard as="section">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-brand-plum dark:text-brand-coral" />
            <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
              1. Quality &amp; Liquidity Filters
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Slider
              label="Min Market Cap"
              valueLabel={
                draft.min_market_cap_cr > 0
                  ? `₹${draft.min_market_cap_cr.toLocaleString("en-IN")} Cr`
                  : "Off"
              }
              min={0}
              max={50000}
              step={500}
              value={draft.min_market_cap_cr}
              onChange={(e) =>
                setDraft((p) => ({ ...p, min_market_cap_cr: Number(e.target.value) }))
              }
              description="Removes smaller, higher-volatility companies below this market capitalization."
            />

            <Slider
              label="Min 20D Avg Traded Value"
              valueLabel={
                draft.min_avg_traded_value_cr > 0
                  ? `₹${draft.min_avg_traded_value_cr} Cr/day`
                  : "Off"
              }
              min={0}
              max={100}
              step={1}
              value={draft.min_avg_traded_value_cr}
              onChange={(e) =>
                setDraft((p) => ({ ...p, min_avg_traded_value_cr: Number(e.target.value) }))
              }
              description="Ensures sufficient daily liquidity (close × volume) so entries/exits have lower slippage."
            />

            <Slider
              label="Minimum Share Price"
              valueLabel={draft.min_price > 0 ? `₹${draft.min_price}` : "Off"}
              min={0}
              max={500}
              step={10}
              value={draft.min_price}
              onChange={(e) =>
                setDraft((p) => ({ ...p, min_price: Number(e.target.value) }))
              }
              description="Avoids low-priced stocks where tick sizes create disproportionate percentage swings."
            />

            <Slider
              label="Within % of 52-Week High"
              valueLabel={
                draft.max_pct_below_52w_high !== null && draft.max_pct_below_52w_high < 100
                  ? `≤ ${draft.max_pct_below_52w_high}%`
                  : "Disabled"
              }
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
              description="Keeps only leaders trading near their 52-week peak (100% disables this rule)."
            />

            <Toggle
              label="Price Above 200-Day SMA"
              checked={draft.above_200dma}
              onChange={(val) => setDraft((p) => ({ ...p, above_200dma: val }))}
              description="Requires long-term trend confirmation so rebounding bear-market stocks are excluded."
            />

            <Card variant="well" padding="p-4" className="flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Unknown Market Cap
                </span>
                <SegmentedControl
                  size="xs"
                  value={draft.unknown_mcap_policy}
                  onChange={(pol) =>
                    setDraft((p) => ({ ...p, unknown_mcap_policy: pol }))
                  }
                  options={[
                    { value: "exclude", label: "Exclude" },
                    { value: "include", label: "Include" },
                  ]}
                />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
                Controls whether stocks missing a cached yfinance market cap are excluded or kept.
              </p>
            </Card>
          </div>

          {availableSectors.length > 0 && (
            <Card variant="well" padding="p-4" className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  Sector Exclusions ({draft.excluded_sectors.length} excluded)
                </span>
                {draft.excluded_sectors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, excluded_sectors: [] }))}
                    className="font-semibold text-brand-plum hover:underline dark:text-brand-coral"
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
                          ? "border-red-300 bg-red-50 text-red-700 line-through dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300"
                          : "border-stone-200 bg-white/80 text-stone-700 hover:border-brand-plum/50 dark:border-stone-700 dark:bg-stone-800/70 dark:text-stone-300 dark:hover:border-brand-coral/50"
                      }`}
                    >
                      {sec}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}
        </GlassCard>

        {/* Section 2 & 3: Momentum + Portfolio + KaTeX Live Math */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <GlassCard as="section" className="space-y-4 xl:col-span-7">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-brand-plum dark:text-brand-coral" />
              <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                2. Momentum &amp; Portfolio Settings
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card variant="well" padding="p-4" className="sm:col-span-2">
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Scoring Method
                </span>
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
                          ? "border-brand-plum/40 bg-brand-plum text-stone-50 shadow-sm dark:border-brand-coral/50 dark:bg-brand-plumDark"
                          : "border-stone-200 bg-white/80 text-stone-700 hover:border-brand-plum/40 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-800/70 dark:text-stone-300 dark:hover:border-brand-coral dark:hover:text-stone-100"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-stone-600 dark:text-stone-400">
                  Vol-adjusted favors steady compounders; Z-score blend combines 6-month and 12-month cross-sectional ranks.
                </p>
              </Card>

              <Slider
                label="Lookback Horizon"
                valueLabel={`${draft.lookback_days}d`}
                min={60}
                max={504}
                value={draft.lookback_days}
                onChange={(e) => {
                  const lb = Number(e.target.value);
                  setDraft((p) => ({
                    ...p,
                    lookback_days: lb,
                    skip_days: Math.min(p.skip_days, lb - 1),
                    min_history_days: Math.max(
                      p.min_history_days,
                      lb + Math.min(p.skip_days, lb - 1)
                    ),
                  }));
                }}
                description="Trading days in the return lookback (252 ≈ 12 months)."
              />

              <Slider
                label="Skip Recent Days"
                valueLabel={`${effectiveSkip}d`}
                min={0}
                max={Math.min(63, draft.lookback_days - 1)}
                value={effectiveSkip}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, skip_days: Number(e.target.value) }))
                }
                description="Skips the latest month (21d) to avoid short-term reversal noise."
              />

              <Slider
                label="Portfolio Holdings (Top N)"
                valueLabel={`${draft.top_n} stocks (${(100 / draft.top_n).toFixed(2)}% each)`}
                min={5}
                max={50}
                value={draft.top_n}
                onChange={(e) => setDraft((p) => ({ ...p, top_n: Number(e.target.value) }))}
                description="Fewer stocks concentrate conviction; more stocks diversify idiosyncratic single-name risk."
                className="sm:col-span-2"
              />
            </div>
          </GlassCard>

          {/* Live KaTeX & Preview Top 5 */}
          <GlassCard
            as="section"
            className="flex flex-col justify-between gap-4 xl:col-span-5"
          >
            <div className="space-y-3">
              <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                Live Pipeline Equations
              </h2>
              <Card variant="well" padding="p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                  Eligibility Gate
                </div>
                <MathFormula display math={filterFormula} />
              </Card>
              <Card variant="well" padding="p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                  Ranking Score &amp; Weight
                </div>
                <MathFormula display math={scoreFormula} />
              </Card>
            </div>

            {preview?.selected?.length > 0 && (
              <Card variant="well" padding="p-3.5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    Live Top 5 Preview ({preview.as_of})
                  </span>
                  {loading && (
                    <span className="font-medium text-brand-plum dark:text-brand-coral">
                      Updating…
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 text-xs">
                  {preview.selected.slice(0, 5).map((s) => (
                    <div key={s.symbol} className="flex items-center justify-between">
                      <span className="font-medium text-stone-800 dark:text-stone-200">
                        <strong className="text-brand-plum dark:text-brand-coral">
                          #{s.rank}
                        </strong>{" "}
                        {shortSymbol(s.symbol)}
                      </span>
                      <span className="tabular-nums text-stone-600 dark:text-stone-400">
                        Score {s.score != null ? s.score.toFixed(2) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Button
              variant="primary"
              size="lg"
              onClick={handleRunAndOpenPicks}
              className="w-full"
            >
              Run Pipeline &amp; View Today&apos;s Picks
              <ArrowRight className="h-4 w-4" />
            </Button>
          </GlassCard>
        </div>
      </PageContainer>
    </AppLayout>
  );
}
