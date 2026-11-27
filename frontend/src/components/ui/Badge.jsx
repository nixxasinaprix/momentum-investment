const BADGE_VARIANTS = {
  neutral:
    "border-brand-plum/20 bg-brand-plum/10 text-[#3B1F4E] dark:border-brand-coral/25 dark:bg-[#2B1740] dark:text-surface-cream",
  plum:
    "border-brand-plum/30 bg-brand-plum/15 text-[#3B1F4E] dark:border-brand-coral/40 dark:bg-brand-plumDark/45 dark:text-brand-coral",
  coral:
    "border-brand-coral/50 bg-brand-coral/20 text-[#5D2C4B] dark:border-brand-coral/45 dark:bg-brand-coral/20 dark:text-brand-coral",
  gold:
    "border-brand-gold/80 bg-brand-gold/30 text-[#3B1F4E] dark:border-brand-gold/45 dark:bg-brand-gold/20 dark:text-brand-gold",
  emerald:
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200",
  orange:
    "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/20 dark:text-orange-200",
  amber:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200",
  red:
    "border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-200",
  sky:
    "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-200",
};

const DOT_COLORS = {
  neutral: "bg-brand-plum dark:bg-brand-coral",
  plum: "bg-brand-plum dark:bg-brand-coral",
  coral: "bg-brand-coral",
  gold: "bg-amber-600 dark:bg-brand-gold",
  emerald: "bg-emerald-600 dark:bg-emerald-400",
  orange: "bg-orange-600 dark:bg-orange-400",
  amber: "bg-amber-600 dark:bg-amber-400",
  red: "bg-red-600 dark:bg-red-400",
  sky: "bg-sky-600 dark:bg-sky-400",
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
