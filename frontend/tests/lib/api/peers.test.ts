import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { allPeersQueryOptions } from "@/lib/api/peers";

afterEach(() => vi.unstubAllGlobals());

function response(page: number, addresses: string[], total: number) {
  return new Response(JSON.stringify({ resultSet: addresses.map(address => ({ address })), pagination: { page, limit: 100, total } }), {status: 200});
}

describe("All peers query", () => {
  it("loads every page with a supported limit and deduplicates peers", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(1, ["first", "second"], 4)).mockResolvedValueOnce(response(2, ["second", "third"], 4));
    vi.stubGlobal("fetch", fetchMock);
    const client = new QueryClient();
    const peers = await client.fetchQuery(allPeersQueryOptions({network: "testnet"}));
    expect(peers.map(peer => peer.address)).toEqual(["first", "second", "third"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get("page")).toBe("2");
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("limit")).toBe("100");
    client.clear();
  });
  it("accepts an empty list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(1, [], 0)));
    const client = new QueryClient();
    expect(await client.fetchQuery(allPeersQueryOptions({network: "testnet"}))).toEqual([]);
    client.clear();
  });
  it("rejects incomplete pagination instead of displaying partial totals", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(1, ["first"], 2)).mockResolvedValueOnce(response(2, [], 2)));
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
    await expect(client.fetchQuery(allPeersQueryOptions({network: "testnet"}))).rejects.toThrow("Incomplete peer list");
    client.clear();
  });
});
