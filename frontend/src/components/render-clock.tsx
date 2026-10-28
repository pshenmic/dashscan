import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

const RenderClockContext = createContext<number | null>(null);

export function RenderClock({
  initialNow,
  children,
}: {
  initialNow: number;
  children: ReactNode;
}) {
  const [now, setNow] = useState(initialNow);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <RenderClockContext.Provider value={now}>
      {children}
    </RenderClockContext.Provider>
  );
}

export function useNow(): number {
  const now = useContext(RenderClockContext);
  if (now === null) throw new Error("useNow must be used within RenderClock");
  return now;
}
