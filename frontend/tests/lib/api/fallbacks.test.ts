import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addressBalanceChartQueryOptions } from "@/lib/api/addresses";
import { SERVER_API_TIMEOUT_MS } from "@/lib/api/client";
import { transactionsByHeightQueryOptions } from "@/lib/api/transactions";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("API fallbacks", () => {
  it("uses the legacy address balance endpoint after a 404", async () => {
    const chart = [
      {
        timestamp: "2026-01-01T00:00:00.000Z",
        data: { balance: "1" },
      },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(Response.json(chart));
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const result = await queryClient.fetchQuery(
      addressBalanceChartQueryOptions({
        network: "testnet",
        address: "Xexample",
        timestampStart: "2026-01-01T00:00:00.000Z",
        timestampEnd: "2026-01-02T00:00:00.000Z",
        intervalsCount: 24,
      }),
    );

    expect(result).toEqual(chart);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0].toString()).toContain(
      "/address/Xexample/balance/chart",
    );
    expect(fetchMock.mock.calls[1]?.[0].toString()).toContain(
      "/address/Xexample/balance/history",
    );
  });

  it("returns an empty page when a transactions-by-height request times out", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const request = queryClient.fetchQuery(
      transactionsByHeightQueryOptions({
        network: "testnet",
        height: 1,
        page: 2,
        limit: 5,
      }),
    );
    await vi.advanceTimersByTimeAsync(SERVER_API_TIMEOUT_MS);

    await expect(request).resolves.toEqual({
      resultSet: [],
      pagination: { page: 2, limit: 5, total: 0 },
    });
  });
});
