import { useEffect, useRef, useState } from "react";
import type { ApiBlock } from "@/lib/api/types";
import type { Network } from "@/lib/store";
import { newBlockHashes } from "@/themes/dash/lib/block-updates";

export function useNewBlocks(blocks: ApiBlock[] | undefined, network: Network) {
  const previous = useRef<{ network: Network; blocks: ApiBlock[] } | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [arrival, setArrival] = useState<{
    network: Network;
    hashes: string[];
  } | null>(null);
  useEffect(() => {
    if (previous.current?.network !== network) {
      previous.current = null;
      if (timer.current) clearTimeout(timer.current);
      setArrival(null);
    }
    if (!blocks?.length) return;
    const hashes = newBlockHashes(previous.current?.blocks, blocks);
    previous.current = { network, blocks };
    if (!hashes.length || document.visibilityState !== "visible") return;
    if (timer.current) clearTimeout(timer.current);
    setArrival({ network, hashes });
    timer.current = setTimeout(() => setArrival(null), 2400);
  }, [blocks, network]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return arrival?.network === network ? arrival.hashes : [];
}
