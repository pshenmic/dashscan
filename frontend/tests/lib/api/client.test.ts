import { describe, expect, it } from "vitest";
import { getBaseUrl } from "@/lib/api/client";

describe("getBaseUrl", () => {
  it("returns mainnet URL", () => {
    expect(getBaseUrl("mainnet")).toBe("https://dashscan.pshenmic.dev");
  });

  it("returns testnet URL", () => {
    expect(getBaseUrl("testnet")).toBe("https://testnet.dashscan.pshenmic.dev");
  });
});
