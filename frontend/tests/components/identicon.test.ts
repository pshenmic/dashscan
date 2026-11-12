import { minidenticon } from "minidenticons";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Avatar } from "@/components/identicon";

describe("identicon avatar", () => {
  it("preserves the existing deterministic identicon and sizing", () => {
    const markup = renderToStaticMarkup(createElement(Avatar, {
      username: "dash-address",
      className: "size-9",
    }));
    const source = encodeURIComponent(minidenticon("dash-address", 50, 50));

    expect(markup).toContain(`data:image/svg+xml;utf8,${source}`);
    expect(markup).toContain('alt="dash-address"');
    expect(markup).toContain("size-9");
  });
});
