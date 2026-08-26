import { Skeleton } from "@/components/ui/skeleton";

export function LazyThemePageFallback() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading page"
      className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8"
    >
      <Skeleton className="h-9 w-64 max-w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-80" />
    </main>
  );
}
