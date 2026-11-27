import { useTheme } from "../context/ThemeContext";
import { formatPct, shortSymbol } from "../lib/format";

function getTileStyle(score, maxAbsScore, dark) {
  if (score === null || score === undefined) {
    return {
      className:
        "border-brand-plum/20 bg-brand-plum/10 text-[#3B1F4E] dark:border-brand-coral/25 dark:bg-[#2B1740]/90 dark:text-surface-cream",
      badgeCls: "text-[#3B1F4E] dark:text-surface-cream",
    };
  }
  const intensity = Math.min(1, Math.abs(score) / Math.max(0.5, maxAbsScore));
  if (score >= 0.4) {
    const opacity = (dark ? 0.22 + intensity * 0.24 : 0.14 + intensity * 0.16).toFixed(2);
    return {
      style: {
        backgroundColor: `rgba(16, 185, 129, ${opacity})`,
        borderColor: dark ? "rgba(52, 211, 153, 0.45)" : "rgba(5, 150, 105, 0.35)",
      },
      badgeCls: "text-emerald-800 dark:text-emerald-200",
    };
  }
  if (score >= 0) {
    const opacity = (dark ? 0.18 + intensity * 0.2 : 0.22 + intensity * 0.18).toFixed(2);
    return {
      style: {
        backgroundColor: `rgba(227, 200, 125, ${opacity})`,
        borderColor: dark ? "rgba(227, 200, 125, 0.45)" : "rgba(180, 134, 28, 0.4)",
      },
      badgeCls: "text-[#5D2C4B] dark:text-brand-gold",
    };
  }
  const opacity = (dark ? 0.22 + intensity * 0.24 : 0.14 + intensity * 0.16).toFixed(2);
  return {
    style: {
      backgroundColor: `rgba(239, 68, 68, ${opacity})`,
      borderColor: dark ? "rgba(248, 113, 113, 0.45)" : "rgba(220, 38, 38, 0.32)",
    },
    badgeCls: "text-red-800 dark:text-red-200",
  };
}

export default function SectorHeatmap({ sectors = [], onSelectSector }) {
  const { dark } = useTheme();
  if (!sectors.length) {
    return null;
  }

  const maxAbs = Math.max(
    0.5,
    ...sectors.map((s) => (s.avg_score !== null ? Math.abs(s.avg_score) : 0))
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sectors.map((item) => {
        const tile = getTileStyle(item.avg_score, maxAbs, dark);
        const isClickable = typeof onSelectSector === "function";
        const Tag = isClickable ? "button" : "div";

        return (
          <Tag
            key={item.sector}
            type={isClickable ? "button" : undefined}
            onClick={isClickable ? () => onSelectSector(item.sector) : undefined}
            style={tile.style}
            className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200 ${
              tile.className || ""
            } ${isClickable ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="line-clamp-2 text-xs font-bold text-[var(--text-primary)]">
                {item.sector}
              </span>
              <span className="shrink-0 rounded-full bg-brand-plum/15 px-2 py-0.5 text-[10px] font-bold text-[#3B1F4E] dark:bg-brand-coral/20 dark:text-surface-cream">
                {item.count}
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-2">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Avg Score
                </div>
                <div className={`font-display text-lg font-extrabold tabular-nums ${tile.badgeCls}`}>
                  {item.avg_score !== null && item.avg_score !== undefined
                    ? item.avg_score.toFixed(2)
                    : "—"}
                </div>
              </div>
              <div className="text-right tabular-nums">
                <div className="text-[10px] font-medium text-[var(--text-muted)]">
                  12-1M: {formatPct(item.avg_momentum, 1)}
                </div>
                <div className="text-[10px] font-medium text-[var(--text-muted)]">
                  &gt;200DMA:{" "}
                  {item.pct_above_200dma !== null ? `${item.pct_above_200dma}%` : "—"}
                </div>
              </div>
            </div>

            {item.top_symbol && (
              <div className="mt-2 border-t border-[var(--border-table)] pt-1.5 text-[11px] text-[var(--text-muted)]">
                Leader:{" "}
                <span className="font-bold text-[var(--text-primary)]">
                  {shortSymbol(item.top_symbol)}
                </span>
              </div>
            )}
          </Tag>
        );
      })}
    </div>
  );
}
