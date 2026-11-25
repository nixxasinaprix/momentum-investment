export default function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  accent = "default",
  onClick,
}) {
  const accentMap = {
    default: "text-[#F0867C] bg-[#F0867C]/10 border-[#F0867C]/25",
    emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/25",
    rose: "text-rose-300 bg-rose-500/10 border-rose-500/25",
    plum: "text-fuchsia-300 bg-[#8C4570]/25 border-[#8C4570]/40",
  };

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`group flex w-full flex-col justify-between rounded-2xl border border-white/10 bg-[#12131F]/90 p-5 text-left shadow-lg transition-all ${
        onClick ? "cursor-pointer hover:border-[#F0867C]/45 hover:bg-[#191627]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-stone-400">
          {label}
        </span>
        {Icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${accentMap[accent] || accentMap.default}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="font-display text-2xl font-bold tracking-tight text-white">
          {value}
        </div>
        {subtext && (
          <p className="mt-1 truncate text-xs text-stone-400">{subtext}</p>
        )}
      </div>
    </Tag>
  );
}
