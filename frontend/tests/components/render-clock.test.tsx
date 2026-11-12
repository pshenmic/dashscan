import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RelativeTime } from "@/components/relative-time";
import { RenderClock, useNow } from "@/components/render-clock";

afterEach(() => {
  vi.useRealTimers();
});

function Countdown({ target }: { target: number }) {
  const now = useNow();
  return <span>{Math.max(0, Math.floor((target - now) / 1000))}</span>;
}

describe("SSR render clock", () => {
  const initialNow = Date.parse("2025-01-15T12:00:00Z");

  function renderSnapshot(now: number) {
    return renderToString(
      <RenderClock initialNow={now}>
        <RelativeTime timestamp="2025-01-15T11:59:01Z" />
        <Countdown target={initialNow + 60_000} />
      </RenderClock>,
    );
  }

  it("reuses server text for the initial client render after a cached response", () => {
    vi.useFakeTimers();
    vi.setSystemTime(initialNow);
    const serverMarkup = renderSnapshot(initialNow);
    vi.setSystemTime(initialNow + 55_000);
    expect(renderSnapshot(initialNow)).toBe(serverMarkup);
    expect(serverMarkup).toContain("59 sec. ago");
    expect(serverMarkup).toContain("<span>60</span>");
  });

  it("keeps the initial clock isolated between different requests", () => {
    const first = renderSnapshot(initialNow);
    expect(renderSnapshot(initialNow + 60_000)).toContain("1 min. ago");
    expect(renderSnapshot(initialNow)).toBe(first);
  });
});
