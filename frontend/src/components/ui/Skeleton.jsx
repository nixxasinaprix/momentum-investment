export function Skeleton({ className = "" }) {
  return <div className={`lab-skeleton rounded-lg ${className}`} />;
}

export function SkeletonCard({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="lab-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="lab-skeleton h-3 w-24 rounded" />
            <div className="lab-skeleton h-9 w-9 rounded-xl" />
          </div>
          <div className="lab-skeleton mt-4 h-7 w-28 rounded" />
          <div className="lab-skeleton mt-2 h-3 w-36 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 320 }) {
  return (
    <div
      style={{ height }}
      className="lab-card flex flex-col justify-between rounded-2xl p-5"
    >
      <div className="flex items-center justify-between">
        <div className="lab-skeleton h-4 w-44 rounded" />
        <div className="lab-skeleton h-6 w-28 rounded" />
      </div>
      <div className="my-auto flex items-end gap-2 pt-6">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            style={{ height: `${25 + ((i * 19) % 65)}%` }}
            className="lab-skeleton flex-1 rounded-t"
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 8, cols = 6 }) {
  return (
    <div className="lab-card overflow-hidden rounded-2xl">
      <div className="lab-table-head px-4 py-3">
        <div className="lab-skeleton h-4 w-48 rounded" />
      </div>
      <div className="divide-y divide-[var(--border-table)]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((__, c) => (
              <div key={c} className="lab-skeleton h-3.5 flex-1 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
