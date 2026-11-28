import { describe, expect, it, vi } from "vitest";
import { Route as addressDetailRoute } from "@/routes/address.$address";
import { Route as addressesRoute } from "@/routes/addresses";
import { Route as blockDetailRoute } from "@/routes/blocks.$hashOrHeight";
import { Route as blocksRoute } from "@/routes/blocks.index";
import { Route as proposalDetailRoute } from "@/routes/dao.$hash";
import { Route as daoRoute } from "@/routes/dao.index";
import { Route as dashboardRoute } from "@/routes/dashboard";
import { Route as masternodeDetailRoute } from "@/routes/masternodes.$hash";
import { Route as masternodesRoute } from "@/routes/masternodes.index";
import { Route as ogRoute } from "@/routes/og.$kind.$id";
import { Route as peersRoute } from "@/routes/peers.index";
import { Route as transactionDetailRoute } from "@/routes/transactions.$hash";
import { Route as transactionsRoute } from "@/routes/transactions.index";

describe("route data loading", () => {
  it("prefetches the minimum SSR data for every user-facing route", () => {
    const routes = [
      dashboardRoute,
      blocksRoute,
      blockDetailRoute,
      transactionsRoute,
      transactionDetailRoute,
      masternodesRoute,
      masternodeDetailRoute,
      addressDetailRoute,
      addressesRoute,
      daoRoute,
      proposalDetailRoute,
      peersRoute,
    ];

    for (const route of routes) {
      expect(route.options.loader).toBeTypeOf("function");
    }
  });

  it("does not require detail data to render the route", async () => {
    const queryClient = {
      prefetchQuery: vi.fn().mockResolvedValue(undefined),
    };

    const loader = blockDetailRoute.options.loader;
    if (typeof loader !== "function") throw new Error("Expected a route loader");

    await expect(
      loader({
        context: { queryClient },
        params: { hashOrHeight: "slow-block" },
      } as never),
    ).resolves.toBeUndefined();

    expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1);
  });

  it("keeps the OG route blocking for complete image data", () => {
    expect(ogRoute.options.loader).toBeTypeOf("function");
  });

  it("prefetches only chain history for network statistics", async () => {
    const queryClient = {
      prefetchQuery: vi.fn().mockResolvedValue(undefined),
    };

    const loader = dashboardRoute.options.loader;
    if (typeof loader !== "function") throw new Error("Expected a route loader");

    const end = Date.UTC(2025, 0, 2);
    await loader({ context: { queryClient }, deps: { days: 1, end } } as never);

    expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1);
    expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          "chainHistory",
          expect.any(String),
          "2025-01-01T00:00:00.000Z",
          "2025-01-02T00:00:00.000Z",
          24,
        ],
      }),
    );
  });
});
