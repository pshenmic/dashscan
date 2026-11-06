import type { ApiBlock } from "@/lib/api/types";

export function newBlockHashes(
  previous: ApiBlock[] | undefined,
  current: ApiBlock[],
) {
  if (!previous?.length) return [];
  const height = Math.max(...previous.map((block) => block.height));
  const known = new Set(previous.map((block) => block.hash));
  return current
    .filter((block) => block.height > height && !known.has(block.hash))
    .map((block) => block.hash);
}
