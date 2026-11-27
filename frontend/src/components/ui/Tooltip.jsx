import { useState } from "react";
import { HelpCircle } from "lucide-react";

export default function Tooltip({
  content,
  children,
  side = "top",
  className = "",
}) {
  const [open, setOpen] = useState(false);

  const posCls =
    side === "bottom"
      ? "top-full left-1/2 mt-2 -translate-x-1/2"
      : "bottom-full left-1/2 mb-2 -translate-x-1/2";

  return (
    <span
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children || (
        <button
          type="button"
          aria-label="More information"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-stone-500 transition hover:text-brand-plum dark:text-stone-400 dark:hover:text-brand-coral"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      )}
      {open && content && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-40 w-max max-w-[240px] rounded-xl border border-stone-200 bg-white/95 px-3 py-2 text-[11px] font-medium leading-snug text-stone-700 shadow-xl backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/95 dark:text-stone-200 ${posCls}`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
