import { formatPct, shortSymbol } from "../lib/format";

function getTileColor(score, maxAbsScore) {
  if (score === null || score === undefined) {
    return "border-white/10 bg-white/[0.03] text-stone-300";
  }
  const intensity = Math.min(1, Math.abs(score) / Math.max(0.5, maxAbsScore));
  if (score >= 0.4) {
    const opacity = (0.14 + intensity * 0.24).toFixed(2);
    return {
      style: {
        backgroundColor: `rgba(16, 185, 129, ${opacity})`,
        borderColor: "rgba(52, 211, 153, 0.35)",
      },
      badgeCls: "text-emerald-300",
    };
  }
  if (score >= 0) {
    const opacity = (0.1 + intensity * 0.16).toFixed(2);
    return {
      style: {
        backgroundColor: `rgba(245, 158, 11, ${opacity})`,
        borderColor: "rgba(251, 191, 36, 0.3)",
      },
      badgeCls: "text-amber-300",
    };
  }
  const opacity = (0.14 + intensity * 0.24).toFixed(2);
  return {
    style: {
      backgroundColor: `rgba(244, 63, 94, ${opacity})`,
      borderColor: "rgba(251, 113, 133, 0.35)",
    },
    badgeCls: "text-rose-300",
  };
}

export default function SectorHeatmap({ sectors = [], onSelectSector }) {
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
        const theme = getTileColor(item.avg_score, maxAbs);
        const isClickable = typeof onSelectSector === "function";
        const Tag = isClickable ? "button" : "div";

        return (
          <Tag
            key={item.sector}
            type={isClickable ? "button" : undefined}
            onClick={isClickable ? () => onSelectSector(item.sector) : undefined}
            style={typeof theme === "object" ? theme.style : undefined}
            className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
              typeof theme === "string" ? theme : ""
            } ${isClickable ? "cursor-pointer hover:brightness-110" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="line-clamp-2 text-xs font-semibold text-white">
                {item.sector}
              </span>
              <span className="shrink-0 rounded-md bg-black/30 px-1.5 py-0.5 text-[10px] font-medium text-stone-300">
                {item.count}
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-400">
                  Avg Score
                </div>
                <div
                  className={`font-display text-lg font-bold ${
                    typeof theme === "object" ? theme.badgeCls : "text-stone-200"
                  }`}
                >
                  {item.avg_score !== null && item.avg_score !== undefined
                    ? item.avg_score.toFixed(2)
                    : "—"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-stone-400">
                  12-1M: {formatPct(item.avg_momentum, 1)}
                </div>
                <div className="text-[10px] text-stone-400">
                  &gt;200DMA:{" "}
                  {item.pct_above_200dma !== null ? `${item.pct_above_200dma}%` : "—"}
                </div>
              </div>
            </div>

            {item.top_symbol && (
              <div className="mt-2 border-t border-white/10 pt-1.5 text-[11px] text-stone-300">
                Leader: <span className="font-semibold text-white">{shortSymbol(item.top_symbol)}</span>
              </div>
            )}
          </Tag>
        );
      })}
    </div>
  );
}
