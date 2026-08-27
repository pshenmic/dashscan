import type { Network } from "@/lib/store";

export const SERVER_API_TIMEOUT_MS = 1_000;
export const BROWSER_API_TIMEOUT_MS = 8_000;

export class ApiTimeoutError extends Error {
  readonly timeoutMs: number;
  readonly url: string;

  constructor(input: RequestInfo | URL, timeoutMs: number, cause?: unknown) {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    super(`API request timed out after ${timeoutMs}ms: ${url}`, { cause });
    this.name = "ApiTimeoutError";
    this.timeoutMs = timeoutMs;
    this.url = url;
  }
}

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export function getApiTimeoutMs(): number {
  return typeof window === "undefined"
    ? SERVER_API_TIMEOUT_MS
    : BROWSER_API_TIMEOUT_MS;
}

export async function apiFetch(
  input: RequestInfo | URL,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { signal, timeoutMs = getApiTimeoutMs(), ...requestInit } = options;
  const controller = new AbortController();
  let abortSource: "caller" | "timeout" | null = null;

  const abortFromCaller = () => {
    if (controller.signal.aborted) return;
    abortSource = "caller";
    controller.abort(signal?.reason);
  };

  if (signal?.aborted) {
    abortFromCaller();
  } else {
    signal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  const timeoutId = setTimeout(() => {
    if (controller.signal.aborted) return;
    abortSource = "timeout";
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, { ...requestInit, signal: controller.signal });
  } catch (error) {
    if (abortSource === "timeout") {
      throw new ApiTimeoutError(input, timeoutMs, error);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

export function getBaseUrl(_network: Network): string {
  return (
    process.env.DASHSCAN_API_URL ?? "https://testnet.dashscan.pshenmic.dev"
  );
}
