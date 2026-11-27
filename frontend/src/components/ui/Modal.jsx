import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "max-w-lg",
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-950/55 backdrop-blur-sm dark:bg-surface-night/80"
          />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`relative z-10 w-full ${maxWidth} overflow-hidden rounded-2xl border border-stone-200 bg-surface-cream shadow-2xl dark:border-stone-800 dark:bg-surface-cardDark`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-200/80 px-6 py-4 dark:border-stone-800">
              <div>
                {title && (
                  <h3
                    id="modal-title"
                    className="font-display text-lg font-bold text-stone-900 dark:text-stone-100"
                  >
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-200/70 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-brand-coral"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5 text-sm text-stone-700 dark:text-stone-300">
              {children}
            </div>
            {footer && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-200/80 bg-white/70 px-6 py-3.5 dark:border-stone-800 dark:bg-stone-900/70">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
