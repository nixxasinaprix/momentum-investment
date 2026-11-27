import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import Button from "./Button";

export function EmptyState({
  title = "No data available",
  description = "Try adjusting your filters or search criteria.",
  icon: Icon = Inbox,
  action,
}) {
  return (
    <div className="lab-card flex flex-col items-center justify-center rounded-2xl px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-coral/25 to-brand-plum/25 text-brand-plum shadow-md dark:text-brand-coral">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-base font-bold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-[var(--text-muted)]">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Unable to load data",
  message = "An unexpected error occurred while fetching data.",
  onRetry,
}) {
  return (
    <div className="lab-card flex flex-col items-center justify-center rounded-2xl border-red-400/50 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-brand-plum text-surface-cream shadow-lg shadow-red-500/30">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-base font-bold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-sm font-medium text-red-700 dark:text-red-300">
        {message}
      </p>
      {onRetry && (
        <Button variant="primary" size="md" onClick={onRetry} className="mt-5">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  );
}
