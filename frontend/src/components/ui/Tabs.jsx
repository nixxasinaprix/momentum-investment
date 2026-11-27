export default function Tabs({ items = [], value, onChange, className = "" }) {
  return (
    <div
      role="tablist"
      className={`inline-flex flex-wrap gap-1 rounded-full border border-stone-200 bg-white/80 p-1 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/80 ${className}`}
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
                ? "bg-brand-plum text-stone-50 shadow-sm dark:bg-brand-plumDark"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-brand-coral"
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
