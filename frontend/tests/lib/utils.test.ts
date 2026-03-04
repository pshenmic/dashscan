import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges multiple class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters out falsy values", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("resolves Tailwind conflicts by keeping the last class", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("merges conditional and conflicting classes", () => {
    expect(cn("text-red-500", true && "text-blue-500")).toBe("text-blue-500");
  });

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("");
  });
});
