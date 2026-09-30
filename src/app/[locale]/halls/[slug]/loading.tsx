/** Skeleton while a hall page loads. */
export default function HallLoading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto max-w-6xl px-5 py-10">
      <div className="aspect-[16/7] animate-pulse rounded-card bg-blush" />
      <div className="mt-6 h-9 w-2/3 animate-pulse rounded-lg bg-blush" />
      <div className="mt-4 space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-blush" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-blush" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-blush" />
      </div>
    </div>
  );
}
