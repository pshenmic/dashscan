import { SkeletonBar } from "./skeleton";

export function TransactionDetailSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading transaction"
      className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-12"
    >
      <output className="sr-only">Loading transaction…</output>
      <div className="space-y-4 rounded-3xl bg-card p-6">
        <SkeletonBar className="w-40" />
        <SkeletonBar className="h-8 w-full" />
        <SkeletonBar className="w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {["metadata", "distribution"].map((panel) => (
          <div
            key={panel}
            className="flex min-h-[469px] flex-col justify-between gap-5 rounded-3xl bg-card p-6"
          >
            <SkeletonBar className="h-20 w-full" />
            {["first", "second", "third", "fourth", "fifth"].map((row) => (
              <SkeletonBar key={row} className="w-full" />
            ))}
          </div>
        ))}
      </div>
      <div className="space-y-6 rounded-3xl bg-card p-6">
        <SkeletonBar className="w-64" />
        <SkeletonBar className="h-64 w-full" />
      </div>
    </main>
  );
}
