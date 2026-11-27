export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-stone-200/85 dark:bg-stone-800/85 ${className}`}
    />
  );
}

export function SkeletonCard({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-stone-200/90 bg-white/80 p-5 shadow-xl backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/80"
        >
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 rounded bg-stone-200 dark:bg-stone-800" />
            <div className="h-9 w-9 rounded-xl bg-stone-200 dark:bg-stone-800" />
          </div>
          <div className="mt-4 h-7 w-28 rounded bg-stone-300/80 dark:bg-stone-700/80" />
          <div className="mt-2 h-3 w-36 rounded bg-stone-200 dark:bg-stone-800" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 320 }) {
  return (
    <div
      style={{ height }}
      className="flex animate-pulse flex-col justify-between rounded-2xl border border-stone-200/90 bg-white/80 p-5 shadow-xl backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/80"
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-44 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-6 w-28 rounded bg-stone-200 dark:bg-stone-800" />
      </div>
      <div className="my-auto flex items-end gap-2 pt-6">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            style={{ height: `${25 + ((i * 19) % 65)}%` }}
            className="flex-1 rounded-t bg-stone-200/90 dark:bg-stone-800/90"
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 8, cols = 6 }) {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-stone-200/90 bg-white/80 shadow-xl backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/80">
      <div className="border-b border-stone-200/80 bg-stone-100/70 px-4 py-3 dark:border-stone-800 dark:bg-stone-800/50">
        <div className="h-4 w-48 rounded bg-stone-200 dark:bg-stone-800" />
      </div>
      <div className="divide-y divide-stone-200/70 dark:divide-stone-800/80">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((__, c) => (
              <div
                key={c}
                className="h-3.5 flex-1 rounded bg-stone-200/80 dark:bg-stone-800/80"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
