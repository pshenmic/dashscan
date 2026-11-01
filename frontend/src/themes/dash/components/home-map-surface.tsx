import { type RefObject, useEffect, useId, useRef, useState } from "react";

export function HomeMapSurface({
  mapRef,
}: {
  mapRef: RefObject<HTMLDivElement | null>;
}) {
  const surfaceId = useId();
  const surfaceRef = useRef<SVGSVGElement>(null);
  const [mapWindow, setMapWindow] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const section = surfaceRef.current?.closest("section");
    const map = mapRef.current;
    if (!section || !map) return;
    const update = () => {
      const outer = section.getBoundingClientRect();
      const inner = map.getBoundingClientRect();
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
    update();
    return () => observer.disconnect();
  }, [mapRef]);

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
          <rect width="100%" height="100%" fill="white" />
          <rect {...mapWindow} rx="24" fill="black" />
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="var(--card)"
        mask={`url(#${surfaceId})`}
      />
    </svg>
  );
}
