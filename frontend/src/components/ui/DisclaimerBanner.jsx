import { Info } from "lucide-react";

export default function DisclaimerBanner({
  title = "Educational Tool — Not Investment Advice.",
  description = "Signals, picks, and backtests are computed mechanically from historical NSE data for research purposes only.",
  right,
  className = "",
}) {
  return (
    <div
      className={`lab-card relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl px-4 py-3 text-xs text-[var(--text-secondary)] ${className}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-coral via-brand-gold to-brand-plum"
      />
      <div className="flex items-start gap-2.5 pl-1.5 sm:items-center">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-gold to-brand-coral text-[#3B1F4E] shadow-sm">
          <Info className="h-3.5 w-3.5" />
        </span>
        <span>
          <strong className="text-[var(--text-primary)]">{title}</strong> {description}
        </span>
      </div>
      {right && (
        <div className="flex flex-wrap items-center gap-3 pl-1.5 text-[11px] font-medium text-[var(--text-muted)] sm:pl-0">
          {right}
        </div>
      )}
    </div>
  );
}
