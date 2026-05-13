import { useCallback, useEffect, useState } from "react";

export type TableViewMode = "infinite" | "pagination";

const STORAGE_PREFIX = "dashscan.tableViewMode.";

function readStored(key: string): TableViewMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    return raw === "infinite" || raw === "pagination" ? raw : null;
  } catch {
    return null;
  }
}

export function useTableViewMode(
  key: string,
  defaultMode: TableViewMode = "infinite",
): [TableViewMode, (mode: TableViewMode) => void] {
  const [mode, setMode] = useState<TableViewMode>(defaultMode);

  useEffect(() => {
    const stored = readStored(key);
    if (stored && stored !== mode) setMode(stored);
  }, [key, mode]);

  const update = useCallback(
    (next: TableViewMode) => {
      setMode(next);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_PREFIX + key, next);
        } catch {}
      }
    },
    [key],
  );

  return [mode, update];
}
