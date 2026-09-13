import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prefetchSsrData } from "@/lib/ssr-prefetch";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("prefetchSsrData", () => {
  it("waits for required SSR data when it settles before the deadline", async () => {
    const queryClient = new QueryClient();
    const cancelQueries = vi.spyOn(queryClient, "cancelQueries");
    const task = vi.fn().mockResolvedValue(undefined);

    await prefetchSsrData(queryClient, [task], 1_000);

    expect(task).toHaveBeenCalledOnce();
    expect(cancelQueries).not.toHaveBeenCalled();
  });

  it("cancels unfinished SSR queries at the deadline", async () => {
    vi.useFakeTimers();
    const queryClient = new QueryClient();
    const cancelQueries = vi
      .spyOn(queryClient, "cancelQueries")
      .mockResolvedValue(undefined);
    const task = vi.fn(() => new Promise<never>(() => {}));

    const prefetch = prefetchSsrData(queryClient, [task], 1_000);
    await vi.advanceTimersByTimeAsync(1_000);
    await prefetch;

    expect(cancelQueries).toHaveBeenCalledOnce();
  });

  it("does not run SSR tasks in the browser", async () => {
    vi.stubGlobal("window", {});
    const queryClient = new QueryClient();
    const task = vi.fn().mockResolvedValue(undefined);

    await prefetchSsrData(queryClient, [task]);

    expect(task).not.toHaveBeenCalled();
  });
});
