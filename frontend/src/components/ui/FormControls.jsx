import { X } from "lucide-react";

const FIELD_BASE =
  "lab-input w-full rounded-xl text-sm placeholder:text-[var(--text-muted)]";

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
    <label className={`block text-xs font-semibold text-[var(--text-muted)] ${className}`}>
      {label && <span className="mb-1 block">{label}</span>}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-plum dark:text-brand-coral" />
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
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-muted)] hover:text-brand-plum dark:hover:text-brand-coral"
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
    <label className={`block text-xs font-semibold text-[var(--text-muted)] ${className}`}>
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
    <div className={`lab-well rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-[var(--text-primary)]">{label}</span>
        <span className="rounded-full bg-brand-plum/10 px-2.5 py-0.5 font-bold tabular-nums text-brand-plum dark:bg-brand-coral/20 dark:text-brand-coral">
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
        className="momentum-slider mt-3 w-full cursor-pointer"
      />
      {description && (
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
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
    <div className={`lab-well flex flex-col justify-between rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[var(--text-primary)]">
          {label}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(checked)}
          onClick={() => onChange(!checked)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold transition-all ${
            checked
              ? "border-brand-plum/40 bg-brand-plum text-surface-cream shadow-sm dark:border-brand-coral/50 dark:bg-brand-coral dark:text-[#3B1F4E]"
              : "border-brand-plum/25 bg-brand-plum/10 text-[var(--text-secondary)] dark:border-brand-coral/30 dark:bg-[#2B1740]"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full transition-colors ${
              checked ? "bg-brand-gold dark:bg-[#3B1F4E]" : "bg-brand-plum/45 dark:bg-brand-coral/50"
            }`}
          />
          {checked ? onLabel : offLabel}
        </button>
      </div>
      {description && (
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
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
      className={`lab-well inline-flex rounded-full p-0.5 ${className}`}
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
                ? "bg-gradient-to-r from-brand-plum to-brand-plumDark text-surface-cream shadow-sm dark:from-brand-coral dark:to-brand-plumDark dark:text-surface-cream"
                : "text-[var(--text-secondary)] hover:text-brand-plum dark:hover:text-brand-coral"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
