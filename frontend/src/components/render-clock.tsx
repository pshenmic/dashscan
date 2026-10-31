import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

function createClock(initialNow: number) {
  let now = initialNow;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => now,
    getServerSnapshot: () => initialNow,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    tick: () => {
      now = Date.now();
      for (const listener of listeners) listener();
    },
  };
}

const RenderClockContext = createContext<ReturnType<typeof createClock> | null>(
  null,
);

export function RenderClock({
  initialNow,
  children,
}: {
  initialNow: number;
  children: ReactNode;
}) {
  const [clock] = useState(() => createClock(initialNow));

  useEffect(() => {
    clock.tick();
    const timer = setInterval(clock.tick, 1000);
    return () => clearInterval(timer);
  }, [clock]);

  return (
    <RenderClockContext.Provider value={clock}>
      {children}
    </RenderClockContext.Provider>
  );
}

export function useClockValue(select: (now: number) => number): number {
  const clock = useContext(RenderClockContext);
  if (clock === null) throw new Error("useNow must be used within RenderClock");
  return useSyncExternalStore(
    clock.subscribe,
    () => select(clock.getSnapshot()),
    () => select(clock.getServerSnapshot()),
  );
}

export function useNow(): number {
  return useClockValue((now) => now);
}
