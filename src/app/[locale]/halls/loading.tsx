/** Skeleton while the hall list loads, so the page doesn't sit blank. */
export default function HallsLoading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto max-w-6xl px-5 py-10">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-blush" />
      <div className="mt-6 h-14 animate-pulse rounded-card bg-peach" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-card bg-blush">
            <div className="aspect-[4/3] animate-pulse bg-peach" />
            <div className="space-y-3 p-4">
              <div className="h-5 w-3/4 animate-pulse rounded bg-peach" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-peach" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
