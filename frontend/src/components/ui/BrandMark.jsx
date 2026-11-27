import { Zap } from "lucide-react";

export default function BrandMark({
  size = "md",
  title = "Momentum Investment",
  subtitle,
  className = "",
}) {
  const boxCls = size === "sm" ? "h-8 w-8 rounded-xl" : "h-9 w-9 rounded-xl";
  const iconCls = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const titleCls = size === "sm" ? "text-sm" : "text-base sm:text-lg";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-coral to-brand-plum shadow-md ${boxCls}`}
      >
        <Zap className={`${iconCls} text-stone-50`} fill="currentColor" />
      </div>
      <div className="min-w-0">
        <div
          className={`truncate font-display font-bold tracking-tight text-stone-900 dark:text-stone-100 ${titleCls}`}
        >
          {title}
        </div>
        {subtitle && (
          <div className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-plum dark:text-brand-coral">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
