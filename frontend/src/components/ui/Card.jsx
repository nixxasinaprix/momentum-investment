const VARIANT_CLS = {
  glass: "lab-card",
  elevated: "lab-card",
  well: "lab-well",
  accent:
    "lab-card border-brand-coral/40 dark:border-brand-coral/40",
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
      className={`rounded-2xl ${
        VARIANT_CLS[variant] || VARIANT_CLS.glass
      } ${padding} ${
        interactive ? "lab-card-interactive cursor-pointer" : ""
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
