import type { Network } from "@/lib/store";

export const SERVER_API_TIMEOUT_MS = 1_000;
export const CLIENT_API_TIMEOUT_MS = 15_000;

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

export async function apiFetch(
  input: RequestInfo | URL,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const {
    signal,
    timeoutMs = typeof window === "undefined"
      ? SERVER_API_TIMEOUT_MS
      : CLIENT_API_TIMEOUT_MS,
    ...requestInit
  } = options;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const callerSignal =
    signal ?? (input instanceof Request ? input.signal : undefined);
  const requestSignal = callerSignal
    ? AbortSignal.any([callerSignal, timeoutSignal])
    : timeoutSignal;

  try {
    return await fetch(input, { ...requestInit, signal: requestSignal });
  } catch (error) {
    if (
      timeoutSignal.aborted &&
      requestSignal.reason === timeoutSignal.reason
    ) {
      throw new ApiTimeoutError(input, timeoutMs, error);
    }
    throw error;
  }
}

export function getBaseUrl(_network: Network): string {
  return (
    process.env.DASHSCAN_API_URL ?? "https://testnet.dashscan.pshenmic.dev"
  );
}
