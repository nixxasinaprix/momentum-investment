import { ChevronRight } from "lucide-react";
import { GlassCard } from "./ui";

const STAGE_STYLES = [
  "border-stone-200/90 bg-surface-cream/85 text-stone-700 dark:border-stone-700/80 dark:bg-stone-800/50 dark:text-stone-200",
  "border-brand-mauve/40 bg-brand-mauve/10 text-stone-800 dark:border-brand-mauve/35 dark:bg-brand-mauve/15 dark:text-stone-100",
  "border-brand-gold/50 bg-brand-gold/20 text-stone-800 dark:border-brand-gold/35 dark:bg-brand-gold/15 dark:text-stone-100",
  "border-emerald-300/80 bg-emerald-50/90 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
];

export default function PipelineFunnel({ stages = [] }) {
  if (!stages.length) return null;
  const maxCount = Math.max(1, stages[0]?.count || 1);

  return (
    <GlassCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
            Selection Funnel
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Stocks surviving each stage: Universe → Quality Filters → Momentum Scoring → Top N Portfolio
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
          {stages.map((s, idx) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="tabular-nums text-stone-900 dark:text-stone-100">{s.count}</span>
              {idx < stages.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider opacity-85">
                <span>
                  {idx + 1}. {stage.label}
                </span>
                <span className="tabular-nums">{pctOfTotal}%</span>
              </div>

              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="font-display text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
                  {stage.count}
                </span>
                {idx > 0 && (
                  <span className="text-[11px] font-medium opacity-80">
                    −{dropped} filtered
                  </span>
                )}
              </div>

              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-200/90 dark:bg-stone-800">
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
