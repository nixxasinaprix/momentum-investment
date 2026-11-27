import { Link } from "react-router-dom";

const VARIANT_CLASSES = {
  primary:
    "bg-brand-plum text-surface-cream shadow-lg shadow-brand-plum/30 hover:bg-brand-plumHover dark:bg-brand-plumDark dark:shadow-brand-plumDark/35 dark:hover:bg-brand-plumDarkHover",
  gradient:
    "bg-gradient-to-r from-brand-plum via-brand-plumDark to-brand-coral text-surface-cream shadow-lg shadow-brand-plum/30 hover:brightness-110 dark:shadow-brand-plumDark/35",
  secondary:
    "border border-brand-plum/30 bg-surface-cream/90 text-[#3B1F4E] shadow-sm hover:border-brand-plum hover:bg-surface-cream dark:border-brand-coral/35 dark:bg-[#2B1740]/90 dark:text-surface-cream dark:hover:border-brand-coral",
  ghost:
    "border border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-brand-coral/15 hover:text-[var(--text-primary)]",
  danger:
    "border border-red-300 bg-red-50 text-red-800 hover:border-red-400 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-200 dark:hover:bg-red-500/30",
};

const SIZE_CLASSES = {
  xs: "px-2.5 py-1 text-xs",
  sm: "px-3.5 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-sm",
};

export default function Button({
  variant = "secondary",
  size = "sm",
  pill = true,
  to,
  className = "",
  children,
  type = "button",
  disabled = false,
  ...props
}) {
  const radius = pill ? "rounded-full" : "rounded-xl";
  const base = `inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-semibold transition-all duration-300 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 ${radius} ${
    VARIANT_CLASSES[variant] || VARIANT_CLASSES.secondary
  } ${SIZE_CLASSES[size] || SIZE_CLASSES.sm} ${className}`;

  if (to) {
    return (
      <Link to={to} className={base} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} className={base} {...props}>
      {children}
    </button>
  );
}
