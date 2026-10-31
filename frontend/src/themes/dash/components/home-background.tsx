import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type GridArea,
  gridSignalFrames,
  gridSignalMotion,
  gridSignalRoute,
  gridSignalStart,
} from "@/themes/dash/lib/grid-signal";

const preferenceKey = "dashscan:home-background-motion";
const bandHeight = 640;

export function HomeBackground() {
  const [enabled, setEnabled] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(
      "(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)",
    );
    const updateMedia = () => setAllowed(media.matches);
    const updateVisibility = () => setVisible(!document.hidden);
    const readPreference = () => {
      try {
        setEnabled(localStorage.getItem(preferenceKey) !== "off");
      } catch {
        setEnabled(true);
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === preferenceKey || event.key === null) readPreference();
    };
    updateMedia();
    updateVisibility();
    readPreference();
    media.addEventListener("change", updateMedia);
    document.addEventListener("visibilitychange", updateVisibility);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", updateMedia);
      document.removeEventListener("visibilitychange", updateVisibility);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function toggleMotion() {
    const next = !enabled;
    setEnabled(next);
    try {
      localStorage.setItem(preferenceKey, next ? "on" : "off");
    } catch {}
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-[88px] bottom-0 -z-10 overflow-hidden"
      >
        <div className="dash-home-grid-surface absolute inset-0">
          <div className="dash-home-grid-fill absolute inset-y-0 left-1/2 w-[1440px] -translate-x-1/2" />
          <div
            className="absolute left-1/2 top-0 h-[1132px] w-[1440px] -translate-x-1/2 bg-foreground"
            style={{
              mask: "url(/images/home/grid.svg) center / contain no-repeat",
            }}
          />
        </div>
        <GridSignals running={enabled && allowed && visible} />
        <div className="dash-home-decoration absolute inset-x-0 top-0">
          <img
            src="/images/home/hero-decoration.png"
            alt=""
            width={1440}
            height={498}
            className="block w-full max-w-none"
          />
        </div>
      </div>
      {allowed && (
        <button
          type="button"
          aria-pressed={enabled}
          title={
            enabled
              ? "Pause background animation"
              : "Resume background animation"
          }
          onClick={toggleMotion}
          className="fixed bottom-4 left-4 z-40 inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {enabled ? (
            <Pause aria-hidden="true" className="size-3.5" />
          ) : (
            <Play aria-hidden="true" className="size-3.5" />
          )}
          Background motion
        </button>
      )}
    </>
  );
}

function GridSignals({ running }: { running: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1440, height: 0 });
  const [surfaces, setSurfaces] = useState<GridArea[]>([]);
  const [activeBands, setActiveBands] = useState<number[]>([]);
  const count = Math.ceil(size.height / bandHeight);

  useEffect(() => {
    const element = container.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const content = Array.from(
      element
        .closest("main")
        ?.querySelectorAll<HTMLElement>("[data-grid-content] > section") ?? [],
    );
    const observer = new ResizeObserver(() => {
      const bounds = element.getBoundingClientRect();
      const width = Math.round(bounds.width);
      const height = Math.round(bounds.height);
      setSize((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height },
      );
      setSurfaces(
        content.map((area) => {
          const rectangle = area.getBoundingClientRect();
          return {
            x: rectangle.left - bounds.left + (1440 - width) / 2,
            y: rectangle.top - bounds.top,
            width: rectangle.width,
            height: rectangle.height,
          };
        }),
      );
    });
    observer.observe(element);
    for (const area of content) observer.observe(area);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = container.current;
    if (
      !element ||
      count === 0 ||
      !running ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const intersections = new Map<Element, number>();
    const bands = element.querySelectorAll<HTMLElement>("[data-grid-band]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting)
            intersections.set(entry.target, entry.intersectionRatio);
          else intersections.delete(entry.target);
        }
        const selected = [...intersections]
          .sort((first, second) => second[1] - first[1])
          .slice(0, 2)
          .map(([target]) => target);
        const next = Array.from(bands).flatMap((band, index) =>
          selected.includes(band) ? [index] : [],
        );
        setActiveBands((previous) =>
          previous.length === next.length &&
          previous.every((value, index) => value === next[index])
            ? previous
            : next,
        );
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const band of bands) observer.observe(band);
    return () => {
      observer.disconnect();
    };
  }, [count, running]);

  return (
    <div
      ref={container}
      data-grid-signals
      data-running={running}
      className="absolute inset-0"
    >
      {Array.from({ length: count }, (_, index) => {
        const height = Math.min(bandHeight, size.height - index * bandHeight);
        const active = running && activeBands.includes(index);
        return (
          <div
            key={index * bandHeight}
            data-grid-band
            data-visible={active}
            className="absolute inset-x-0 overflow-hidden"
            style={{ top: index * bandHeight, height }}
          >
            <div
              className="absolute left-1/2 top-0 w-[1440px] -translate-x-1/2 text-brand"
              style={{ height }}
            >
              {[0, 1, 2].map((lane) => (
                <GridSignalRoute
                  key={lane}
                  lane={lane}
                  band={index}
                  height={height}
                  width={size.width}
                  areas={surfaces}
                  active={active}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GridSignalRoute({
  lane,
  band,
  height,
  width,
  areas,
  active,
}: {
  lane: number;
  band: number;
  height: number;
  width: number;
  areas: GridArea[];
  active: boolean;
}) {
  const element = useRef<SVGPathElement>(null);
  const [cycle, setCycle] = useState(0);
  const elapsed = useRef(
    lane * gridSignalMotion.stagger +
      ((band % 2) * gridSignalMotion.stagger) / 2,
  );
  const points = useMemo(() => {
    const inset = band === 0 ? 154 : 0;
    return gridSignalRoute({
      top: band * bandHeight + inset,
      height: height - inset,
      width,
      seed: (band + 1) * 7919 + lane * 104729 + cycle * 65537,
      upward: (band + lane + cycle) % 2 === 1,
      lane,
    }).map((point) => ({ ...point, y: point.y + inset }));
  }, [band, height, width, lane, cycle]);
  const start = useMemo(
    () => gridSignalStart(points, areas, band * bandHeight),
    [points, areas, band],
  );
  useEffect(() => {
    if (!active || !element.current || points.length < 2) return;
    const animation = element.current.animate(gridSignalFrames(start), {
      duration: gridSignalMotion.duration,
      iterations: 1,
    });
    animation.currentTime = elapsed.current;
    let finished = false;
    animation.onfinish = () => {
      finished = true;
      elapsed.current = 0;
      setCycle((previous) => previous + 1);
    };
    return () => {
      if (!finished)
        elapsed.current =
          Number(animation.currentTime ?? 0) % gridSignalMotion.duration;
      animation.onfinish = null;
      animation.cancel();
    };
  }, [active, points, start]);
  if (points.length === 0) return null;
  const left = Math.min(...points.map((point) => point.x)) - 2;
  const top = Math.min(...points.map((point) => point.y)) - 2;
  const routeWidth = Math.max(...points.map((point) => point.x)) - left + 2;
  const routeHeight = Math.max(...points.map((point) => point.y)) - top + 2;
  const length = points.reduce(
    (total, point, index) =>
      index === 0
        ? 0
        : total +
          Math.abs(point.x - points[index - 1].x) +
          Math.abs(point.y - points[index - 1].y),
    0,
  );
  return (
    <div
      className="absolute overflow-hidden [contain:paint]"
      style={{
        left,
        top,
        width: routeWidth,
        height: routeHeight,
        willChange: active ? "transform" : undefined,
      }}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        width={routeWidth}
        height={routeHeight}
        viewBox={`${left} ${top} ${routeWidth} ${routeHeight}`}
      >
        <path
          ref={element}
          className="dash-grid-signal"
          d={points
            .map(
              (point, index) =>
                `${index === 0 ? "M" : "L"}${point.x} ${point.y}`,
            )
            .join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${gridSignalMotion.trail} ${length + gridSignalMotion.trail}`}
        />
      </svg>
    </div>
  );
}
