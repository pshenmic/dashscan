import { type RefObject, useEffect, useId, useRef, useState } from "react";
import { mapSurfaceOutline, mapSurfaceRadius } from "../lib/map-surface";

export function HomeMapSurface({
  mapRef,
  insetRef,
  cutoutRef,
}: {
  mapRef: RefObject<HTMLDivElement | null>;
  insetRef?: RefObject<HTMLDivElement | null>;
  cutoutRef?: RefObject<HTMLDivElement | null>;
}) {
  const surfaceId = useId();
  const surfaceRef = useRef<SVGSVGElement>(null);
  const [outline, setOutline] = useState<string | null>(null);
  const [mapWindow, setMapWindow] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const section = surfaceRef.current?.closest("[data-map-panel]");
    const map = mapRef.current;
    if (!section || !map) return;
    const update = () => {
      const outer = section.getBoundingClientRect();
      const inner = map.getBoundingClientRect();
      const inset = insetRef?.current?.getBoundingClientRect();
      if (inset) {
        const cutout = cutoutRef?.current?.getBoundingClientRect();
        const hasCutout = cutout && inset.left > inner.left + 1;
        setOutline(
          mapSurfaceOutline({
            width: outer.width,
            height: outer.height,
            cutout: hasCutout
              ? {
                  right: cutout.right - outer.left,
                  top: cutout.top - outer.top,
                }
              : undefined,
          }),
        );
      }
      const next = {
        x: inner.left - outer.left,
        y: inner.top - outer.top,
        width: inner.width,
        height: inner.height,
      };
      setMapWindow((previous) =>
        previous.x === next.x &&
        previous.y === next.y &&
        previous.width === next.width &&
        previous.height === next.height
          ? previous
          : next,
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(section);
    observer.observe(map);
    if (map.parentElement) observer.observe(map.parentElement);
    if (insetRef?.current) observer.observe(insetRef.current);
    if (cutoutRef?.current) observer.observe(cutoutRef.current);
    update();
    return () => observer.disconnect();
  }, [mapRef, insetRef, cutoutRef]);

  return (
    <svg
      ref={surfaceRef}
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full rounded-[inherit]"
    >
      <defs>
        <mask
          id={surfaceId}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="100%"
          height="100%"
        >
          {outline ? (
            <path d={outline} fill="white" />
          ) : (
            <rect width="100%" height="100%" fill="white" />
          )}
          <rect {...mapWindow} rx={mapSurfaceRadius} fill="black" />
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="var(--card)"
        mask={`url(#${surfaceId})`}
      />
      {outline && <path d={outline} fill="none" stroke="var(--border)" />}
    </svg>
  );
}
