import { SkeletonBar } from "./skeleton";

export function BlockDetailSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading block"
      className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-16"
    >
      <output className="sr-only">Loading block…</output>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex min-h-[312px] min-w-0 flex-col gap-3 pt-2 sm:px-4">
          <SkeletonBar className="h-12 w-64" />
          <div className="flex flex-1 flex-col justify-between gap-3 rounded-3xl border border-border bg-card px-4 py-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <SkeletonBar className="w-16" />
                <div className="flex gap-1.5">
                  <SkeletonBar className="h-10 w-20" />
                  <SkeletonBar className="h-10 w-20" />
                </div>
              </div>
              <SkeletonBar className="h-6 w-56 max-w-full" />
            </div>
            {["hash", "merkle"].map((field) => (
              <div key={field} className="space-y-1">
                <SkeletonBar className="w-20" />
                <SkeletonBar className="h-6 w-full" />
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
              {["nonce", "difficulty", "version"].map((field) => (
                <SkeletonBar key={field} className="h-9 w-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4 rounded-3xl bg-card p-4">
          <div className="flex justify-between">
            <SkeletonBar className="w-16" />
            <SkeletonBar className="w-24" />
          </div>
          <SkeletonBar className="h-48 w-full rounded-3xl" />
        </div>
      </div>
      <section
        aria-label="Transactions"
        className="space-y-4 rounded-3xl bg-card p-4 sm:p-6"
      >
        <h2 className="text-xl font-extrabold">Transactions</h2>
        <SkeletonBar className="h-11 w-full" />
        {["first", "second", "third", "fourth", "fifth"].map((row) => (
          <SkeletonBar key={row} className="h-11 w-full" />
        ))}
      </section>
    </main>
  );
}
