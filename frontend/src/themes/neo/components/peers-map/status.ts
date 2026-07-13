export type PeerAvailabilityBucket = "available" | "unavailable";

export const AVAILABILITY_COLOR: Record<PeerAvailabilityBucket, string> = {
  available: "var(--success)",
  unavailable: "var(--destructive)",
};

export const AVAILABILITY_SORT_ORDER: Record<PeerAvailabilityBucket, number> = {
  available: 0,
  unavailable: 1,
};

export function peerBucket(available: boolean): PeerAvailabilityBucket {
  return available ? "available" : "unavailable";
}
