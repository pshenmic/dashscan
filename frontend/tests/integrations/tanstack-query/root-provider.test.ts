import { describe, expect, it } from "vitest";
import { getContext } from "@/integrations/tanstack-query/root-provider";

describe("getContext", () => {
  it("creates an isolated QueryClient for every router request", () => {
    const firstContext = getContext();
    const secondContext = getContext();

    expect(firstContext.queryClient).not.toBe(secondContext.queryClient);
  });

  it("does not retry failed SSR queries", () => {
    const { queryClient } = getContext();

    expect(queryClient.getDefaultOptions().queries?.retry).toBe(0);
  });
});
