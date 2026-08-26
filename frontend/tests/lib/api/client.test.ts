import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiFetch,
  ApiTimeoutError,
  BROWSER_API_TIMEOUT_MS,
  getApiTimeoutMs,
  getBaseUrl,
  SERVER_API_TIMEOUT_MS,
} from "@/lib/api/client";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete process.env.DASHSCAN_API_URL;
});

describe("getBaseUrl", () => {
  it("uses the configured API URL", () => {
    process.env.DASHSCAN_API_URL = "https://api.example.com";

    expect(getBaseUrl("mainnet")).toBe("https://api.example.com");
    expect(getBaseUrl("testnet")).toBe("https://api.example.com");
  });

  it("falls back to the testnet API URL", () => {
    expect(getBaseUrl("testnet")).toBe("https://testnet.dashscan.pshenmic.dev");
  });
});

describe("getApiTimeoutMs", () => {
  it("uses a short deadline on the server", () => {
    expect(getApiTimeoutMs()).toBe(SERVER_API_TIMEOUT_MS);
  });

  it("uses a longer deadline in the browser", () => {
    vi.stubGlobal("window", {});

    expect(getApiTimeoutMs()).toBe(BROWSER_API_TIMEOUT_MS);
  });
});

describe("apiFetch", () => {
  it("throws a clear timeout error and aborts the request", async () => {
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

    const request = apiFetch("https://api.example.com/slow", {
      timeoutMs: 25,
    });
    const assertion = expect(request).rejects.toMatchObject({
      name: "ApiTimeoutError",
      timeoutMs: 25,
      url: "https://api.example.com/slow",
      message:
        "API request timed out after 25ms: https://api.example.com/slow",
    });

    await vi.advanceTimersByTimeAsync(25);
    await assertion;
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it("preserves caller cancellation and request options", async () => {
    const abortError = new DOMException("Navigation cancelled", "AbortError");
    const callerController = new AbortController();
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

    const request = apiFetch("https://api.example.com/data", {
      headers: { Accept: "application/json" },
      method: "POST",
      signal: callerController.signal,
      timeoutMs: 1_000,
    });
    callerController.abort(abortError);

    const error = await request.catch((cause: unknown) => cause);

    expect(error).toBe(abortError);
    expect(error).not.toBeInstanceOf(ApiTimeoutError);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/data",
      expect.objectContaining({
        headers: { Accept: "application/json" },
        method: "POST",
        signal: expect.any(AbortSignal),
      }),
    );
  });
});
