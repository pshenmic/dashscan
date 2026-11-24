import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COLOR_MODE_INIT_SCRIPT, setColorMode } from "@/themes/color-mode";

afterEach(() => vi.unstubAllGlobals());

function createRoot() {
  const attributes = new Map<string, string>();
  return {
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    getAttribute: (name: string) => attributes.get(name),
    classList: { toggle: vi.fn() },
    style: { colorScheme: "" },
  };
}

describe("Dash color mode", () => {
  it("initializes Dash with the saved dark mode regardless of old theme cookies", () => {
    const root = createRoot();
    runInNewContext(COLOR_MODE_INIT_SCRIPT, {
      document: { documentElement: root, cookie: "theme=neo; theme_dash_default=1" },
      localStorage: { getItem: () => "dark" },
    });
    expect(root.getAttribute("data-theme")).toBe("dash");
    expect(root.getAttribute("data-color-mode")).toBe("dark");
    expect(root.classList.toggle).toHaveBeenCalledWith("dark", true);
    expect(root.style.colorScheme).toBe("dark");
  });

  it("defaults to light mode when storage is unavailable", () => {
    const root = createRoot();
    runInNewContext(COLOR_MODE_INIT_SCRIPT, { document: { documentElement: root } });
    expect(root.getAttribute("data-theme")).toBe("dash");
    expect(root.getAttribute("data-color-mode")).toBe("light");
    expect(root.style.colorScheme).toBe("light");
  });

  it("persists changes and notifies color mode subscribers", () => {
    const root = createRoot();
    const window = { localStorage: { setItem: vi.fn() }, dispatchEvent: vi.fn() };
    vi.stubGlobal("document", { documentElement: root });
    vi.stubGlobal("window", window);
    setColorMode("dark");
    expect(root.classList.toggle).toHaveBeenCalledWith("dark", true);
    expect(window.localStorage.setItem).toHaveBeenCalledWith("dashscan-color-mode", "dark");
    expect(window.dispatchEvent).toHaveBeenCalledOnce();
    setColorMode("light");
    expect(root.style.colorScheme).toBe("light");
  });

  it("does not access the document during server rendering", () => {
    expect(() => setColorMode("dark")).not.toThrow();
  });
});
