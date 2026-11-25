const TREND_STYLES = {
  "Strong uptrend": {
    pill: "border-emerald-500/35 bg-emerald-500/15 text-emerald-300",
    dot: "bg-emerald-400",
  },
  Pullback: {
    pill: "border-amber-500/35 bg-amber-500/15 text-amber-300",
    dot: "bg-amber-400",
  },
  Weakening: {
    pill: "border-orange-500/35 bg-orange-500/15 text-orange-300",
    dot: "bg-orange-400",
  },
  Downtrend: {
    pill: "border-rose-500/35 bg-rose-500/15 text-rose-300",
    dot: "bg-rose-400",
  },
  "Insufficient data": {
    pill: "border-white/15 bg-white/5 text-stone-400",
    dot: "bg-stone-500",
  },
};

export default function TrendBadge({ trend, size = "sm" }) {
  const style = TREND_STYLES[trend] || TREND_STYLES["Insufficient data"];
  const sizeCls = size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold tracking-wide ${style.pill} ${sizeCls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {trend || "Insufficient data"}
    </span>
  );
}
