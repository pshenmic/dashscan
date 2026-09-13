import type { QueryClient } from "@tanstack/react-query";
import { SERVER_API_TIMEOUT_MS } from "./api/client";

type PrefetchTask = () => Promise<unknown>;

/**
 * Prefetches only data required for the initial server render.
 *
 * The query client belongs to a single SSR request, so cancelling every
 * outstanding query at the deadline is safe. Components can start the same
 * queries again in the browser when data did not arrive in time.
 */
export async function prefetchSsrData(
  queryClient: QueryClient,
  tasks: readonly PrefetchTask[],
  timeoutMs = SERVER_API_TIMEOUT_MS,
): Promise<void> {
  if (typeof window !== "undefined" || tasks.length === 0) return;

  const settled = Promise.allSettled(
    tasks.map((task) => Promise.resolve().then(task)),
  );
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timedOut = await Promise.race([
    settled.then(() => false),
    new Promise<true>((resolve) => {
      timeoutId = setTimeout(() => resolve(true), timeoutMs);
    }),
  ]);

  if (timeoutId !== undefined) clearTimeout(timeoutId);
  if (timedOut) await queryClient.cancelQueries();
}
