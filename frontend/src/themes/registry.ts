export type ThemeName = "dash" | "neo";

export const THEME_NAMES: readonly ThemeName[] = ["dash", "neo"] as const;

export const DEFAULT_THEME: ThemeName = "dash";

export const THEME_COOKIE_NAME = "theme";

export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isThemeName(value: unknown): value is ThemeName {
  return value === "dash" || value === "neo";
}
