import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type { ApiHistoricalEntry } from "./types";

interface FetchVolumeInput {
  network: Network;
  currency: "usd" | "btc";
}

async function getVolume(params: FetchVolumeInput) {
  const url = new URL(`/volume/${params.currency}`, getBaseUrl(params.network));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<Record<string, number>>;
}

export const fetchVolume = createServerFn({ method: "POST" })
  .inputValidator((input: FetchVolumeInput) => input)
  .handler(({ data }) => getVolume(data));

export function volumeQueryOptions(params: FetchVolumeInput) {
  return queryOptions({
    queryKey: ["volume", params.network, params.currency],
    queryFn: () => getVolume(params),
  });
}

async function getVolumeHistorical(params: FetchVolumeInput) {
  const url = new URL(
    `/volume/${params.currency}/chart`,
    getBaseUrl(params.network),
  );
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiHistoricalEntry[]>;
}

export const fetchVolumeHistorical = createServerFn({ method: "POST" })
  .inputValidator((input: FetchVolumeInput) => input)
  .handler(({ data }) => getVolumeHistorical(data));

export function volumeHistoricalQueryOptions(params: FetchVolumeInput) {
  return queryOptions({
    queryKey: ["volumeHistorical", params.network, params.currency],
    queryFn: () => getVolumeHistorical(params),
  });
}
