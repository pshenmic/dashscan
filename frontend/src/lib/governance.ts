const SUPERBLOCK_INTERVAL = 16616;
const BLOCKS_PER_DAY = 553.87;

export function getRequiredVotes(masternodeCount: number): number {
  return Math.floor(masternodeCount / 10) + 1;
}

export function getNextSuperblockHeight(currentHeight: number): number {
  return Math.ceil(currentHeight / SUPERBLOCK_INTERVAL) * SUPERBLOCK_INTERVAL;
}

export function getDaysUntilSuperblock(currentHeight: number): number {
  const next = getNextSuperblockHeight(currentHeight);
  return Math.round((next - currentHeight) / BLOCKS_PER_DAY);
}

export function getVotingDeadline(currentHeight: number): Date {
  const votingCutoff = getNextSuperblockHeight(currentHeight) - 1662;
  const blocksRemaining = votingCutoff - currentHeight;
  const msRemaining = (blocksRemaining / BLOCKS_PER_DAY) * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + msRemaining);
}
