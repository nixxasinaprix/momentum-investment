const BADGE_VARIANTS = {
  neutral:
    "border-stone-200 bg-stone-100 text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300",
  plum:
    "border-brand-plum/25 bg-brand-plum/10 text-brand-plum dark:border-brand-coral/35 dark:bg-brand-plumDark/30 dark:text-brand-coral",
  coral:
    "border-brand-coral/45 bg-brand-coral/15 text-brand-plum dark:border-brand-coral/35 dark:bg-brand-coral/15 dark:text-brand-coral",
  gold:
    "border-brand-gold/70 bg-brand-gold/25 text-stone-800 dark:border-brand-gold/40 dark:bg-brand-gold/15 dark:text-brand-gold",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300",
  orange:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-300",
  amber:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-300",
  red:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/35 dark:bg-red-500/15 dark:text-red-300",
  sky:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/35 dark:bg-sky-500/15 dark:text-sky-300",
};

const DOT_COLORS = {
  neutral: "bg-stone-500 dark:bg-stone-400",
  plum: "bg-brand-plum dark:bg-brand-coral",
  coral: "bg-brand-coral",
  gold: "bg-amber-500 dark:bg-brand-gold",
  emerald: "bg-emerald-500 dark:bg-emerald-400",
  orange: "bg-orange-500 dark:bg-orange-400",
  amber: "bg-amber-500 dark:bg-amber-400",
  red: "bg-red-500 dark:bg-red-400",
  sky: "bg-sky-500 dark:bg-sky-400",
};

const SIZE_CLS = {
  xs: "px-2 py-0.5 text-[10px]",
  sm: "px-2.5 py-0.5 text-[11px]",
  md: "px-3 py-1 text-xs",
};

export function Badge({
  variant = "neutral",
  size = "sm",
  dot = false,
  pulseDot = false,
  className = "",
  children,
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold tracking-wide ${
        BADGE_VARIANTS[variant] || BADGE_VARIANTS.neutral
      } ${SIZE_CLS[size] || SIZE_CLS.sm} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            DOT_COLORS[variant] || DOT_COLORS.neutral
          } ${pulseDot ? "animate-pulse" : ""}`}
        />
      )}
      {children}
    </span>
  );
}

const TREND_VARIANT = {
  "Strong uptrend": "emerald",
  Pullback: "gold",
  Weakening: "orange",
  Downtrend: "red",
  "Insufficient data": "neutral",
};

export function TrendBadge({ trend, size = "sm" }) {
  const variant = TREND_VARIANT[trend] || "neutral";
  return (
    <Badge variant={variant} size={size} dot>
      {trend || "Insufficient data"}
    </Badge>
  );
}

export default Badge;
