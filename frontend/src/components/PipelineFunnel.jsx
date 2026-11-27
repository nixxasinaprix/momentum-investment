import { ChevronRight } from "lucide-react";
import { GlassCard } from "./ui";

const STAGE_STYLES = [
  "border-brand-plum/25 bg-brand-plum/[0.06] text-[#3B1F4E] dark:border-brand-coral/25 dark:bg-brand-plumDark/25 dark:text-surface-cream",
  "border-brand-mauve/40 bg-brand-mauve/15 text-[#3B1F4E] dark:border-brand-mauve/35 dark:bg-brand-mauve/20 dark:text-surface-cream",
  "border-brand-gold/65 bg-brand-gold/25 text-[#3B1F4E] dark:border-brand-gold/40 dark:bg-brand-gold/15 dark:text-surface-cream",
  "border-emerald-300 bg-emerald-50/95 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100",
];

export default function PipelineFunnel({ stages = [] }) {
  if (!stages.length) return null;
  const maxCount = Math.max(1, stages[0]?.count || 1);

  return (
    <GlassCard className="relative overflow-hidden">
      {/* Soft corner blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-gold/20 blur-xl"
      />

      <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
            Selection Funnel
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Stocks surviving each stage: Universe → Quality Filters → Momentum Scoring → Top N Portfolio
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
          {stages.map((s, idx) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="tabular-nums text-[var(--text-primary)]">{s.count}</span>
              {idx < stages.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-brand-plum dark:text-brand-coral" />
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stages.map((stage, idx) => {
          const pctOfTotal = Math.round((stage.count / maxCount) * 100);
          const prevCount = idx > 0 ? stages[idx - 1].count : stage.count;
          const dropped = idx > 0 ? Math.max(0, prevCount - stage.count) : 0;

          return (
            <div
              key={stage.key}
              className={`flex flex-col justify-between rounded-xl border p-3.5 ${
                STAGE_STYLES[idx] || STAGE_STYLES[0]
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider opacity-90">
                <span>
                  {idx + 1}. {stage.label}
                </span>
                <span className="tabular-nums">{pctOfTotal}%</span>
              </div>

              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="font-display text-2xl font-extrabold tabular-nums">
                  {stage.count}
                </span>
                {idx > 0 && (
                  <span className="text-[11px] font-semibold opacity-80">
                    −{dropped} filtered
                  </span>
                )}
              </div>

              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-brand-plum/15 dark:bg-surface-night/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-plum via-brand-coral to-brand-gold transition-all duration-300"
                  style={{ width: `${Math.max(4, pctOfTotal)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
