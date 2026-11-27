export default function Tabs({ items = [], value, onChange, className = "" }) {
  return (
    <div
      role="tablist"
      className={`lab-well inline-flex flex-wrap gap-1 rounded-full p-1 ${className}`}
    >
      {items.map((item) => {
        const active = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              active
                ? "bg-gradient-to-r from-brand-plum to-brand-plumDark text-surface-cream shadow-sm dark:from-brand-coral dark:to-brand-plumDark"
                : "text-[var(--text-secondary)] hover:bg-brand-coral/15 hover:text-brand-plum dark:hover:text-brand-coral"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
