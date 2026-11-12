import { useSyncExternalStore } from "react";

export type ColorMode = "light" | "dark";

const STORAGE_KEY = "dashscan-color-mode";
const CHANGE_EVENT = "dashscan:color-mode";

export const COLOR_MODE_INIT_SCRIPT = `(function(){var r=document.documentElement;var m='light';try{if(localStorage.getItem('${STORAGE_KEY}')==='dark')m='dark';}catch(e){}r.setAttribute('data-theme','dash');r.setAttribute('data-color-mode',m);var d=m==='dark';r.classList.toggle('dark',d);r.classList.toggle('light',!d);r.style.colorScheme=d?'dark':'light';})();`;

export function applyColorMode(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = root.getAttribute("data-color-mode") === "dark";
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function setColorMode(mode: ColorMode): void {
  if (typeof window === "undefined") return;
  document.documentElement.setAttribute("data-color-mode", mode);
  applyColorMode();
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
