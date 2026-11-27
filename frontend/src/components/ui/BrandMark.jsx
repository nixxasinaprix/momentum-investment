import { Zap } from "lucide-react";

export default function BrandMark({
  size = "md",
  title = "Momentum Investment",
  subtitle,
  inverted = false,
  className = "",
}) {
  const boxCls = size === "sm" ? "h-8 w-8 rounded-xl" : "h-9 w-9 rounded-xl";
  const iconCls = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const titleCls = size === "sm" ? "text-sm" : "text-base sm:text-lg";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-coral to-brand-plum shadow-md ring-2 ${
          inverted
            ? "ring-surface-cream/30 dark:ring-brand-coral/40"
            : "ring-brand-coral/35 dark:ring-brand-coral/30"
        } ${boxCls}`}
      >
        <Zap className={`${iconCls} text-surface-cream`} fill="currentColor" />
      </div>
      <div className="min-w-0">
        <div
          className={`truncate font-display font-bold tracking-tight ${
            inverted
              ? "text-surface-cream"
              : "text-[#3B1F4E] dark:text-surface-cream"
          } ${titleCls}`}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className={`truncate text-[10px] font-semibold uppercase tracking-[0.16em] ${
              inverted
                ? "text-brand-gold"
                : "text-brand-plum dark:text-brand-coral"
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
