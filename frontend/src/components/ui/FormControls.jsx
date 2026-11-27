import { X } from "lucide-react";

const FIELD_BASE =
  "w-full rounded-xl border border-stone-300/90 bg-white/85 text-sm text-stone-900 shadow-sm backdrop-blur-sm transition-colors placeholder:text-stone-400 focus:border-brand-plum focus:outline-none dark:border-stone-700 dark:bg-stone-900/85 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-coral";

export function Input({
  label,
  icon: Icon,
  onClear,
  value,
  error,
  className = "",
  inputClassName = "",
  ...props
}) {
  return (
    <label className={`block text-xs font-medium text-stone-600 dark:text-stone-400 ${className}`}>
      {label && <span className="mb-1 block">{label}</span>}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
        )}
        <input
          value={value}
          className={`${FIELD_BASE} py-2 ${Icon ? "pl-9" : "px-3"} ${
            onClear && value ? "pr-8" : "pr-3"
          } ${inputClassName}`}
          {...props}
        />
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear input"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-stone-400 hover:text-stone-900 dark:text-stone-500 dark:hover:text-brand-coral"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}

export function Select({
  label,
  icon: Icon,
  className = "",
  selectClassName = "",
  children,
  ...props
}) {
  return (
    <label className={`block text-xs font-medium text-stone-600 dark:text-stone-400 ${className}`}>
      {label && <span className="mb-1 block">{label}</span>}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-plum dark:text-brand-coral" />
        )}
        <select
          className={`${FIELD_BASE} py-2 ${Icon ? "pl-8" : "px-3"} pr-3 ${selectClassName}`}
          {...props}
        >
          {children}
        </select>
      </div>
    </label>
  );
}

export function Slider({
  label,
  valueLabel,
  description,
  min,
  max,
  step = 1,
  value,
  onChange,
  className = "",
}) {
  return (
    <div
      className={`rounded-xl border border-stone-200/80 bg-surface-cream/85 p-4 dark:border-stone-800 dark:bg-surface-nightAlt/80 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-stone-900 dark:text-stone-100">{label}</span>
        <span className="font-bold tabular-nums text-brand-plum dark:text-brand-coral">
          {valueLabel}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="momentum-slider mt-2.5 w-full cursor-pointer"
      />
      {description && (
        <p className="mt-2 text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
          {description}
        </p>
      )}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  onLabel = "Enabled",
  offLabel = "Off",
  className = "",
}) {
  return (
    <div
      className={`flex flex-col justify-between rounded-xl border border-stone-200/80 bg-surface-cream/85 p-4 dark:border-stone-800 dark:bg-surface-nightAlt/80 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
          {label}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(checked)}
          onClick={() => onChange(!checked)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold transition-all ${
            checked
              ? "border-brand-plum/35 bg-brand-plum/10 text-brand-plum dark:border-brand-coral/40 dark:bg-brand-coral/15 dark:text-brand-coral"
              : "border-stone-300 bg-white/80 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full transition-colors ${
              checked ? "bg-brand-plum dark:bg-brand-coral" : "bg-stone-400 dark:bg-stone-600"
            }`}
          />
          {checked ? onLabel : offLabel}
        </button>
      </div>
      {description && (
        <p className="mt-2 text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
          {description}
        </p>
      )}
    </div>
  );
}

export function SegmentedControl({
  options = [],
  value,
  onChange,
  size = "sm",
  className = "",
}) {
  const btnCls = size === "xs" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1 text-xs";

  return (
    <div
      className={`inline-flex rounded-full border border-stone-200 bg-stone-100/90 p-0.5 dark:border-stone-700/80 dark:bg-stone-900/90 ${className}`}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-full font-semibold transition-all ${btnCls} ${
              active
                ? "bg-brand-plum text-stone-50 shadow-sm dark:bg-brand-plumDark"
                : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-brand-coral"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
