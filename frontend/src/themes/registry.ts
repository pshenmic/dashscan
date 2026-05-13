export type ThemeName = "classic" | "redesign";

export const THEME_NAMES: readonly ThemeName[] = [
  "classic",
  "redesign",
] as const;

export const DEFAULT_THEME: ThemeName = "classic";

export const THEME_COOKIE_NAME = "theme";

export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isThemeName(value: unknown): value is ThemeName {
  return value === "classic" || value === "redesign";
}
