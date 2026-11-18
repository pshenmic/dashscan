import { SkeletonBar } from "./skeleton";

export function BlockDetailSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading block"
      className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-16"
    >
      <output className="sr-only">Loading block…</output>
      <div className="grid gap-6 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex min-h-[312px] min-w-0 flex-col gap-3 pt-2">
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
        <div className="min-w-0 lg:pt-2">
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-7 lg:rounded-tl-[3rem]">
            <div className="grid grid-cols-1 items-start gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <SkeletonBar className="h-5 w-24" />
                <SkeletonBar className="mt-1 h-8 w-48 sm:h-9" />
              </div>
              <SkeletonBar className="h-16 w-40 max-w-full -translate-y-1 justify-self-end rounded-3xl sm:-translate-y-2" />
            </div>
            <SkeletonBar className="mt-3 h-28 w-full rounded-2xl" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-card p-3 sm:p-4">
            {["confirmations", "chainlock", "size"].map((field) => (
              <SkeletonBar key={field} className="h-10 w-full" />
            ))}
          </div>
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
