import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import Button from "./Button";

export function EmptyState({
  title = "No data available",
  description = "Try adjusting your filters or search criteria.",
  icon: Icon = Inbox,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-stone-200/90 bg-white/80 px-6 py-12 text-center shadow-xl backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/80">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-base font-bold text-stone-900 dark:text-stone-100">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-stone-600 dark:text-stone-400">
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/85 px-6 py-10 text-center shadow-xl backdrop-blur-md dark:border-red-500/25 dark:bg-red-950/35">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-100 text-red-600 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-base font-bold text-stone-900 dark:text-stone-100">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-red-700 dark:text-red-200/85">
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
