const ACCENT_MAP = {
  default:
    "border-brand-coral/35 bg-brand-coral/15 text-brand-plum dark:border-brand-coral/30 dark:bg-brand-coral/15 dark:text-brand-coral",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber:
    "border-brand-gold/60 bg-brand-gold/25 text-stone-800 dark:border-brand-gold/35 dark:bg-brand-gold/15 dark:text-brand-gold",
  rose:
    "border-red-200 bg-red-50 text-red-600 dark:border-red-500/25 dark:bg-red-500/15 dark:text-red-300",
  red:
    "border-red-200 bg-red-50 text-red-600 dark:border-red-500/25 dark:bg-red-500/15 dark:text-red-300",
  plum:
    "border-brand-plum/25 bg-brand-plum/10 text-brand-plum dark:border-brand-plumDark/40 dark:bg-brand-plumDark/25 dark:text-brand-coral",
};

export default function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  accent = "default",
  onClick,
  className = "",
}) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`group flex w-full flex-col justify-between rounded-2xl border border-stone-200/90 bg-white/80 p-5 text-left shadow-xl backdrop-blur-md transition-all duration-300 dark:border-stone-800 dark:bg-stone-900/80 ${
        onClick
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-brand-plum/50 hover:shadow-2xl dark:hover:border-brand-coral/50"
          : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">
          {label}
        </span>
        {Icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
              ACCENT_MAP[accent] || ACCENT_MAP.default
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="font-display text-2xl font-bold tracking-tight tabular-nums text-stone-900 dark:text-stone-100">
          {value}
        </div>
        {subtext && (
          <p className="mt-1 truncate text-xs text-stone-600 dark:text-stone-400">
            {subtext}
          </p>
        )}
      </div>
    </Tag>
  );
}
