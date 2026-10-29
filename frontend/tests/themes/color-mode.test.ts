import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyColorMode, COLOR_MODE_INIT_SCRIPT, setColorMode } from "@/themes/color-mode";

function createRoot(theme = "dash") {
  const attributes = new Map([["data-theme", theme]]);
  const classes = new Set<string>();
  return {
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    classList: {
      toggle: (name: string, enabled: boolean) => enabled ? classes.add(name) : classes.delete(name),
      contains: (name: string) => classes.has(name),
    },
    style: { colorScheme: "" },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("Dash color mode", () => {
  it.each(["light", "dark"])("restores %s before hydration", (mode) => {
    const root = createRoot();
    runInNewContext(COLOR_MODE_INIT_SCRIPT, {
      document: { documentElement: root },
      localStorage: { getItem: () => mode },
    });
    expect(root.getAttribute("data-color-mode")).toBe(mode);
    expect(root.style.colorScheme).toBe(mode);
    expect(root.classList.contains(mode)).toBe(true);
  });

  it("defaults to light when storage is unavailable", () => {
    const root = createRoot();
    runInNewContext(COLOR_MODE_INIT_SCRIPT, {
      document: { documentElement: root },
      localStorage: { getItem: () => { throw new Error("Blocked"); } },
    });
    expect(root.style.colorScheme).toBe("light");
  });

  it("keeps Neo light and restores Dash's preference on return", () => {
    const root = createRoot("neo");
    runInNewContext(COLOR_MODE_INIT_SCRIPT, {
      document: { documentElement: root },
      localStorage: { getItem: () => "dark" },
    });
    expect(root.style.colorScheme).toBe("light");
    vi.stubGlobal("document", { documentElement: root });
    applyColorMode("dash");
    expect(root.style.colorScheme).toBe("dark");
    applyColorMode("neo");
    expect(root.style.colorScheme).toBe("light");
    expect(root.getAttribute("data-color-mode")).toBe("dark");
  });

  it.each([false, true])("updates the page even when storage fails: %s", (blocked) => {
    const root = createRoot();
    const persist = vi.fn(() => { if (blocked) throw new Error("Blocked"); });
    const dispatchEvent = vi.fn();
    vi.stubGlobal("document", { documentElement: root });
    vi.stubGlobal("window", { localStorage: { setItem: persist }, dispatchEvent });
    setColorMode("dark");
    expect(root.style.colorScheme).toBe("dark");
    expect(persist).toHaveBeenCalledWith("dashscan-color-mode", "dark");
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });
});
