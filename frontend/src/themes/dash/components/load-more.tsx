import { useEffect, useRef } from "react";

export function LoadMore({
  loading,
  failed,
  onLoad,
}: {
  loading: boolean;
  failed: boolean;
  onLoad: () => void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (
      loading ||
      failed ||
      !sentinel.current ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          observer.disconnect();
          onLoad();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [loading, failed, onLoad]);

  return (
    <div ref={sentinel} className="mt-4 flex flex-col items-center gap-2">
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          Could not load more blocks.
        </p>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={onLoad}
        className="rounded-xl bg-secondary px-4 py-2 text-sm hover:bg-action-subtle focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
      >
        {loading ? "Loading…" : failed ? "Try again" : "Load more"}
      </button>
    </div>
  );
}
