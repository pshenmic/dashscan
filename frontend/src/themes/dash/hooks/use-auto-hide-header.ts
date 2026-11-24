import { useEffect, useRef, useState } from "react";

export function useAutoHideHeader(blocked: boolean, routeKey: string) {
  const [hidden, setHidden] = useState(false);
  const hiddenRef = useRef(false);
  const previousRoute = useRef(routeKey);

  useEffect(() => {
    const updateHidden = (next: boolean) => {
      if (hiddenRef.current === next) return;
      hiddenRef.current = next;
      setHidden(next);
    };
    if (blocked || previousRoute.current !== routeKey) {
      previousRoute.current = routeKey;
      updateHidden(false);
    }
    if (blocked) return;

    let previousScroll = window.scrollY;
    let distance = 0;
    let frame: number | null = null;
    const update = () => {
      frame = null;
      const scroll = window.scrollY;
      const maximum = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      if (scroll < 0 || scroll > maximum) return;
      const delta = scroll - previousScroll;
      previousScroll = scroll;
      if (scroll <= 88) {
        distance = 0;
        updateHidden(false);
        return;
      }
      if (delta === 0) return;
      distance =
        Math.sign(delta) === Math.sign(distance) ? distance + delta : delta;
      const threshold = distance > 0 ? 32 : 8;
      if (Math.abs(distance) < threshold) return;
      updateHidden(distance > 0);
      distance = 0;
    };
    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [blocked, routeKey]);

  return blocked ? false : hidden;
}
