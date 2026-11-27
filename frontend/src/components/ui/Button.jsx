import { Link } from "react-router-dom";

const VARIANT_CLASSES = {
  primary:
    "bg-brand-plum text-stone-50 shadow-lg shadow-brand-plum/30 hover:bg-brand-plumHover dark:bg-brand-plumDark dark:shadow-brand-plumDark/30 dark:hover:bg-brand-plumDarkHover",
  gradient:
    "bg-gradient-to-r from-brand-plum via-brand-plumDark to-brand-coral text-stone-50 shadow-lg shadow-brand-plum/30 hover:brightness-110 dark:shadow-brand-plumDark/30",
  secondary:
    "border border-stone-300 bg-white/85 text-stone-700 shadow-sm backdrop-blur-sm hover:border-brand-plum hover:text-stone-900 dark:border-stone-700 dark:bg-stone-800/85 dark:text-stone-200 dark:hover:border-brand-coral dark:hover:text-stone-100",
  ghost:
    "border border-transparent bg-transparent text-stone-700 hover:bg-stone-200/60 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800/60 dark:hover:text-brand-coral",
  danger:
    "border border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 dark:border-red-500/35 dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/25",
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
