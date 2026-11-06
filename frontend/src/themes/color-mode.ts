import { useSyncExternalStore } from "react";
import type { ThemeName } from "./registry";

export type ColorMode = "light" | "dark";

const STORAGE_KEY = "dashscan-color-mode";
const CHANGE_EVENT = "dashscan:color-mode";

export const COLOR_MODE_INIT_SCRIPT = `(function(){var r=document.documentElement;var m='light';try{if(localStorage.getItem('${STORAGE_KEY}')==='dark')m='dark';}catch(e){}r.setAttribute('data-color-mode',m);var d=r.getAttribute('data-theme')==='dash'&&m==='dark';r.classList.toggle('dark',d);r.classList.toggle('light',!d);r.style.colorScheme=d?'dark':'light';})();`;

export function applyColorMode(theme: ThemeName): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark =
    theme === "dash" && root.getAttribute("data-color-mode") === "dark";
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function setColorMode(mode: ColorMode): void {
  if (typeof window === "undefined") return;
  document.documentElement.setAttribute("data-color-mode", mode);
  applyColorMode(
    document.documentElement.getAttribute("data-theme") === "dash"
      ? "dash"
      : "neo",
  );
  window.dispatchEvent(new Event(CHANGE_EVENT));
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    return;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function getSnapshot(): ColorMode {
  return document.documentElement.getAttribute("data-color-mode") === "dark"
    ? "dark"
    : "light";
}

export function useColorMode(): ColorMode {
  return useSyncExternalStore(subscribe, getSnapshot, () => "light");
}
