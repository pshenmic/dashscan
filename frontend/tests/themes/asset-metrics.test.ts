import { describe, expect, it } from "vitest";
import type { ApiTransaction } from "@/lib/api/types";
import { assetTransferAmount } from "@/themes/dash/lib/asset-metrics";

describe("Home AssetLock metrics", () => {
  it("uses lock payload outputs instead of transaction totals that include change", () => {
    const transaction = { type: "ASSET_LOCK", amount: "99999737", extraPayload: { version: 1, count: 2, outputs: [
      { satoshis: "1000000", script: "" }, { satoshis: "2000000", script: "" },
    ] } } as ApiTransaction;
    expect(assetTransferAmount(transaction)).toBe("3000000");
    expect(assetTransferAmount({ ...transaction, extraPayload: null })).toBeNull();
  });

  it("preserves integer precision and zero amounts", () => {
    const transaction = { type: "ASSET_LOCK", extraPayload: { version: 1, count: 2, outputs: [
      { satoshis: "9007199254740993", script: "" }, { satoshis: "1", script: "" },
    ] } } as ApiTransaction;
    expect(assetTransferAmount(transaction)).toBe("9007199254740994");
    expect(assetTransferAmount({ type: "ASSET_UNLOCK", amount: "0" } as ApiTransaction)).toBe("0");
    expect(assetTransferAmount({ type: "ASSET_UNLOCK", amount: "84601571" } as ApiTransaction)).toBe("84601571");
  });

  it("does not invent amounts for incomplete or invalid transactions", () => {
    expect(assetTransferAmount(undefined)).toBeNull();
    expect(assetTransferAmount({ type: "CLASSIC", amount: "100" } as ApiTransaction)).toBeNull();
    for (const amount of [null, "", "-1", "1.2", "NaN"]) {
      expect(assetTransferAmount({ type: "ASSET_UNLOCK", amount } as ApiTransaction)).toBeNull();
    }
    for (const outputs of [[], [{ satoshis: "-1", script: "" }]]) {
      expect(assetTransferAmount({ type: "ASSET_LOCK", extraPayload: { version: 1, count: outputs.length, outputs } } as ApiTransaction)).toBeNull();
    }
  });

});
