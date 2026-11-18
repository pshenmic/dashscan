import { SkeletonBar } from "./skeleton";

export function BlockDetailSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading block"
      className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-16"
    >
      <output className="sr-only">Loading block…</output>
      <SkeletonBar className="h-[42px] w-72" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex min-h-[312px] min-w-0 flex-col justify-between gap-3 rounded-3xl bg-card px-4 py-4 sm:px-6">
          {[
            "timestamp",
            "hash",
            "confirmations",
            "chainlock",
            "size",
            "merkle",
            "nonce",
            "difficulty",
            "version",
          ].map((field) => (
            <div
              key={field}
              className="flex items-center justify-between gap-8"
            >
              <SkeletonBar className="w-24" />
              <SkeletonBar className={field === "merkle" ? "w-80" : "w-40"} />
            </div>
          ))}
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
