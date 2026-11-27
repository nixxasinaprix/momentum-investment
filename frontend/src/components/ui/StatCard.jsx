const ACCENT_STYLES = {
  default: {
    topBar: "from-brand-coral via-brand-gold to-brand-plum",
    iconTile:
      "from-brand-coral to-brand-plum text-surface-cream shadow-lg shadow-brand-coral/35",
    blob: "bg-brand-coral/20",
  },
  emerald: {
    topBar: "from-emerald-400 via-brand-gold to-emerald-600",
    iconTile:
      "from-emerald-500 to-teal-700 text-surface-cream shadow-lg shadow-emerald-500/35",
    blob: "bg-emerald-400/20",
  },
  amber: {
    topBar: "from-brand-gold via-brand-coral to-amber-600",
    iconTile:
      "from-brand-gold to-amber-600 text-[#3B1F4E] shadow-lg shadow-brand-gold/40",
    blob: "bg-brand-gold/25",
  },
  rose: {
    topBar: "from-red-400 via-brand-coral to-brand-plum",
    iconTile:
      "from-red-500 to-brand-plum text-surface-cream shadow-lg shadow-red-500/35",
    blob: "bg-red-400/20",
  },
  red: {
    topBar: "from-red-400 via-brand-coral to-brand-plum",
    iconTile:
      "from-red-500 to-brand-plum text-surface-cream shadow-lg shadow-red-500/35",
    blob: "bg-red-400/20",
  },
  plum: {
    topBar: "from-brand-plum via-brand-mauve to-brand-coral",
    iconTile:
      "from-brand-plum to-brand-mauve text-surface-cream shadow-lg shadow-brand-plum/40",
    blob: "bg-brand-mauve/25",
  },
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
  const theme = ACCENT_STYLES[accent] || ACCENT_STYLES.default;

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`lab-card group relative flex w-full flex-col justify-between overflow-hidden rounded-2xl p-5 text-left ${
        onClick ? "lab-card-interactive cursor-pointer" : ""
      } ${className}`}
    >
      {/* Thin gradient top border */}
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${theme.topBar}`}
      />

      {/* Soft organic corner blob matching login card */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-md ${theme.blob}`}
        style={{ borderRadius: "55% 45% 50% 50% / 50% 55% 45% 50%" }}
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </span>
        {Icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.iconTile}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="relative z-10 mt-3">
        <div className="font-display text-2xl font-extrabold tracking-tight tabular-nums text-[var(--text-primary)]">
          {value}
        </div>
        {subtext && (
          <p className="mt-1 truncate text-xs font-medium text-[var(--text-muted)]">
            {subtext}
          </p>
        )}
      </div>
    </Tag>
  );
}
