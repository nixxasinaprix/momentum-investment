import { Info } from "lucide-react";

export default function DisclaimerBanner({
  title = "Educational Tool — Not Investment Advice.",
  description = "Signals, picks, and backtests are computed mechanically from historical NSE data for research purposes only.",
  right,
  className = "",
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-gold/65 bg-brand-gold/20 px-4 py-2.5 text-xs text-stone-800 shadow-sm backdrop-blur-md dark:border-brand-gold/30 dark:bg-brand-gold/10 dark:text-stone-200 ${className}`}
    >
      <div className="flex items-start gap-2 sm:items-center">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-plum dark:text-brand-gold sm:mt-0" />
        <span>
          <strong>{title}</strong> {description}
        </span>
      </div>
      {right && (
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-700 dark:text-stone-300">
          {right}
        </div>
      )}
    </div>
  );
}
