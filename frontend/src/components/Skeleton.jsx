export function SkeletonCard({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-white/10 bg-[#12131F]/80 p-5"
        >
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="h-9 w-9 rounded-xl bg-white/10" />
          </div>
          <div className="mt-4 h-7 w-28 rounded bg-white/15" />
          <div className="mt-2 h-3 w-36 rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 320 }) {
  return (
    <div
      style={{ height }}
      className="flex animate-pulse flex-col justify-between rounded-2xl border border-white/10 bg-[#12131F]/80 p-5"
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-44 rounded bg-white/10" />
        <div className="h-6 w-28 rounded bg-white/10" />
      </div>
      <div className="my-auto flex items-end gap-2 pt-6">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            style={{ height: `${25 + ((i * 19) % 65)}%` }}
            className="flex-1 rounded-t bg-white/10"
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 8, cols = 6 }) {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-white/10 bg-[#12131F]/80">
      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="h-4 w-48 rounded bg-white/10" />
      </div>
      <div className="divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((__, c) => (
              <div
                key={c}
                className="h-3.5 flex-1 rounded bg-white/10"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
