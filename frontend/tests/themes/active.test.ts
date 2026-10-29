import { afterEach, describe, expect, it, vi } from "vitest";
import { hydrateThemeFromDocument, setTheme, themeStore } from "@/themes/active";
import { DEFAULT_THEME } from "@/themes/registry";

afterEach(() => {
  vi.unstubAllGlobals();
  themeStore.setState(() => ({ theme: DEFAULT_THEME }));
});

describe("theme state", () => {
  it("switches the store without a browser document", () => {
    setTheme("dash");
    expect(themeStore.state.theme).toBe("dash");
  });

  it("persists the selected theme to the document", () => {
    const document = {
      documentElement: {
        setAttribute: vi.fn(),
        getAttribute: () => "light",
        classList: { toggle: vi.fn() },
        style: {},
      },
      cookie: "",
    };
    vi.stubGlobal("document", document);

    setTheme("dash");

    expect(themeStore.state.theme).toBe("dash");
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith("data-theme", "dash");
    expect(document.cookie).toContain("theme=dash;");
  });

  it("hydrates the store from a valid document theme", () => {
    vi.stubGlobal("document", {
      documentElement: { getAttribute: () => "dash" },
    });

    hydrateThemeFromDocument();

    expect(themeStore.state.theme).toBe("dash");
  });

  it("ignores an unknown document theme", () => {
    vi.stubGlobal("document", {
      documentElement: { getAttribute: () => "unknown" },
    });

    hydrateThemeFromDocument();

    expect(themeStore.state.theme).toBe(DEFAULT_THEME);
  });
});
