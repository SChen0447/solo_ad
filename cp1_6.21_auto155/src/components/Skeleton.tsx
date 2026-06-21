export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-stone-100 bg-white p-4 shadow-sm">
          <div className="skeleton-shimmer h-4 w-3/4 rounded" />
          <div className="skeleton-shimmer mt-3 h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  )
}
