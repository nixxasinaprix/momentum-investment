const VARIANT_CLS = {
  glass:
    "border border-stone-200/90 bg-white/80 shadow-xl backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/80",
  elevated:
    "border border-stone-200 bg-white/85 shadow-xl backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/85",
  well:
    "border border-stone-200/80 bg-surface-cream/85 dark:border-stone-800 dark:bg-surface-nightAlt/80",
  accent:
    "border border-brand-plum/25 bg-gradient-to-br from-brand-coral/10 via-white/85 to-brand-gold/15 shadow-xl backdrop-blur-md dark:border-brand-coral/30 dark:from-brand-plumDark/25 dark:via-stone-900/85 dark:to-surface-cardDark/90",
};

export function Card({
  variant = "glass",
  padding = "p-5",
  interactive = false,
  as: Tag = "div",
  className = "",
  children,
  ...props
}) {
  return (
    <Tag
      className={`rounded-2xl transition-all duration-700 ${
        VARIANT_CLS[variant] || VARIANT_CLS.glass
      } ${padding} ${
        interactive
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-brand-plum/45 hover:shadow-2xl dark:hover:border-brand-coral/45"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function GlassCard(props) {
  return <Card variant="glass" {...props} />;
}

export default Card;
