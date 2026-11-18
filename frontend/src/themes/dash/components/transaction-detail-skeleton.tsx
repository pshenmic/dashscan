import { SkeletonBar } from "./skeleton";

export function TransactionDetailSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading transaction"
      className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-16"
    >
      <output className="sr-only">Loading transaction…</output>
      <div className="flex items-center gap-2">
        <SkeletonBar className="h-12 w-1/3 max-w-56" />
        <SkeletonBar className="h-12 flex-1" />
      </div>
      <SkeletonBar className="h-8 w-64 max-w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["block", "amounts", "properties"].map((panel) => (
          <div
            key={panel}
            className="min-w-0 space-y-3 rounded-3xl border border-border bg-card p-4 sm:p-5"
          >
            <SkeletonBar className="w-32" />
            <SkeletonBar className="h-8 w-44" />
            <SkeletonBar className="h-6 w-32" />
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
