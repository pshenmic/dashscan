import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import {
  DEFAULT_THEME,
  isThemeName,
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_COOKIE_NAME,
  type ThemeName,
} from "./registry";

interface ThemeState {
  theme: ThemeName;
}

export const themeStore = new Store<ThemeState>({ theme: DEFAULT_THEME });

export function useActiveTheme(): ThemeName {
  return useStore(themeStore, (state) => state.theme);
}

export function setTheme(theme: ThemeName): void {
  themeStore.setState({ theme });

  if (typeof document === "undefined") return;

  document.documentElement.setAttribute("data-theme", theme);
  // biome-ignore lint/suspicious/noDocumentCookie: synchronous theme persistence; Cookie Store API is async and not universally supported
  document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(theme)}; path=/; max-age=${THEME_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

export function hydrateThemeFromDocument(): void {
  if (typeof document === "undefined") return;

  const attr = document.documentElement.getAttribute("data-theme");
  if (isThemeName(attr) && attr !== themeStore.state.theme) {
    themeStore.setState({ theme: attr });
  }
}
