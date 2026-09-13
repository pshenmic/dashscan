import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  allMasternodesGeoQueryOptions,
  allMasternodesQueryOptions,
} from "@/lib/api/masternodes";
import type { ApiMasternode, PaginatedResponse } from "@/lib/api/types";

const masternode: ApiMasternode = {
  proTxHash: "pro-tx-hash",
  address: "127.0.0.1:9999",
  payee: "payee",
  status: "ENABLED",
  type: "Regular",
  posPenaltyScore: 0,
  consecutivePayments: 0,
  lastPaidTime: null,
  lastPaidBlock: 1,
  ownerAddress: "owner",
  votingAddress: "voting",
  collateralAddress: "collateral",
  pubKeyOperator: "operator",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  geoIpInfo: {
    ipv4: "127.0.0.1",
    countryCode: "US",
    city: "New York",
    latitude: 40.7128,
    longitude: -74.006,
  },
};

const response: PaginatedResponse<ApiMasternode> = {
  resultSet: [masternode],
  pagination: { page: 1, limit: 1, total: 1 },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("all masternodes queries", () => {
  it("loads and shares the full list with one unpaginated request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = new QueryClient();
    const result = await queryClient.fetchQuery(
      allMasternodesQueryOptions({ network: "testnet" }),
    );
    const geoObserver = new QueryObserver(
      queryClient,
      allMasternodesGeoQueryOptions({ network: "testnet" }),
    );

    expect(result).toEqual([masternode]);
    expect(geoObserver.getCurrentResult().data).toEqual([
      {
        proTxHash: masternode.proTxHash,
        status: masternode.status,
        type: masternode.type,
        address: masternode.address,
        ipv4: "127.0.0.1",
        countryCode: "US",
        city: "New York",
        lat: 40.7128,
        lng: -74.006,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0].toString()).toBe(
      "https://testnet.dashscan.pshenmic.dev/masternodes?order=desc",
    );
  });
});
