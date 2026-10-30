import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RenderClock } from "@/components/render-clock";
import Footer from "@/themes/dash/components/footer";

describe("Dash footer", () => {
  it("uses the request clock for copyright and defers local time until hydration", () => {
    const markup = renderToString(<RenderClock initialNow={Date.parse("2026-01-01T00:00:00Z")}><Footer /></RenderClock>);
    expect(markup).toContain("2026");
    expect(markup).toContain("DashScan Explorer");
    expect(markup).not.toContain("datetime=");
    expect(markup).toContain("Social links");
    expect(markup.match(/target="_blank"/g)).toHaveLength(3);
    expect(markup.match(/rel="noopener noreferrer"/g)).toHaveLength(3);
  });
});
