export type AddressActivityWindow = "24h" | "3d" | "7d" | "30d";

const WINDOW_MS: Record<AddressActivityWindow, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export function getAddressActivityWindowBounds(
  window: AddressActivityWindow,
  now = new Date(),
) {
  const end = new Date(now);
  end.setSeconds(0, 0);
  return {
    timestampStart: new Date(end.getTime() - WINDOW_MS[window]).toISOString(),
    timestampEnd: end.toISOString(),
  };
}
