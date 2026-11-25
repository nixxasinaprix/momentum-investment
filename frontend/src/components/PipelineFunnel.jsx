import { ChevronRight } from "lucide-react";

const STAGE_STYLES = [
  "border-white/15 bg-white/[0.04] text-stone-200",
  "border-sky-500/35 bg-sky-500/10 text-sky-200",
  "border-amber-500/35 bg-amber-500/10 text-amber-200",
  "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
];

export default function PipelineFunnel({ stages = [] }) {
  if (!stages.length) return null;
  const maxCount = Math.max(1, stages[0]?.count || 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 shadow-lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-bold text-white">
            Selection Funnel
          </h2>
          <p className="text-xs text-stone-400">
            Stocks surviving each stage: Universe → Quality Filters → Momentum Scoring → Top N Portfolio
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-300">
          {stages.map((s, idx) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="text-white">{s.count}</span>
              {idx < stages.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-stone-500" />
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
                <span>{pctOfTotal}%</span>
              </div>

              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="font-display text-2xl font-bold text-white">
                  {stage.count}
                </span>
                {idx > 0 && (
                  <span className="text-[11px] opacity-80">
                    −{dropped} filtered
                  </span>
                )}
              </div>

              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-black/35">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8C4570] to-[#F0867C] transition-all duration-300"
                  style={{ width: `${Math.max(4, pctOfTotal)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
