import { describe, expect, it } from "vitest";
import { Route as addressDetailRoute } from "@/routes/address.$address";
import { Route as addressesRoute } from "@/routes/addresses";
import { Route as blockDetailRoute } from "@/routes/blocks.$hashOrHeight";
import { Route as blocksRoute } from "@/routes/blocks.index";
import { Route as proposalDetailRoute } from "@/routes/dao.$hash";
import { Route as daoRoute } from "@/routes/dao.index";
import { Route as dashboardRoute } from "@/routes/index";
import { Route as masternodeDetailRoute } from "@/routes/masternodes.$hash";
import { Route as masternodesRoute } from "@/routes/masternodes.index";
import { Route as ogRoute } from "@/routes/og.$kind.$id";
import { Route as peersRoute } from "@/routes/peers.index";
import { Route as transactionDetailRoute } from "@/routes/transactions.$hash";
import { Route as transactionsRoute } from "@/routes/transactions.index";

describe("route data loading", () => {
  it("keeps user-facing routes independent from backend loaders", () => {
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
      expect(route.options.loader).toBeUndefined();
    }
  });

  it("keeps the OG route blocking for complete image data", () => {
    expect(ogRoute.options.loader).toBeTypeOf("function");
  });
});
