import type { Network } from "@/lib/store";

interface GovernanceParams {
  superblockInterval: number;
  votingDeadlineBlocksBeforeSb: number;
  blocksPerDay: number;
}

const GOVERNANCE_PARAMS: Record<Network, GovernanceParams> = {
  mainnet: {
    superblockInterval: 16616,
    votingDeadlineBlocksBeforeSb: 1662,
    blocksPerDay: 553.87,
  },
  testnet: {
    superblockInterval: 24,
    votingDeadlineBlocksBeforeSb: 2,
    blocksPerDay: 576,
  },
};

export function getGovernanceParams(network: Network): GovernanceParams {
  return GOVERNANCE_PARAMS[network];
}

export function getPreviousSuperblockHeight(
  currentHeight: number,
  network: Network,
): number {
  const { superblockInterval } = GOVERNANCE_PARAMS[network];
  return Math.floor(currentHeight / superblockInterval) * superblockInterval;
}

export function getSuperblockProgress(
  currentHeight: number,
  network: Network,
): number {
  if (currentHeight <= 0) return 0;
  const { superblockInterval } = GOVERNANCE_PARAMS[network];
  const prev = getPreviousSuperblockHeight(currentHeight, network);
  return Math.min(1, Math.max(0, (currentHeight - prev) / superblockInterval));
}

export function getRequiredVotes(masternodeCount: number): number {
  return Math.floor(masternodeCount / 10) + 1;
}

export function getNextSuperblockHeight(
  currentHeight: number,
  network: Network,
): number {
  const { superblockInterval } = GOVERNANCE_PARAMS[network];
  return Math.ceil(currentHeight / superblockInterval) * superblockInterval;
}

export function getBlocksUntilSuperblock(
  currentHeight: number,
  network: Network,
): number {
  return getNextSuperblockHeight(currentHeight, network) - currentHeight;
}

export function getMsUntilSuperblock(
  currentHeight: number,
  network: Network,
  blockTimeMs?: number | null,
): number {
  const blocks = getBlocksUntilSuperblock(currentHeight, network);
  const ms = blockTimeMs ?? defaultBlockTimeMs(network);
  return blocks * ms;
}

function defaultBlockTimeMs(network: Network): number {
  return (24 * 60 * 60 * 1000) / GOVERNANCE_PARAMS[network].blocksPerDay;
}

export function getVotingDeadline(
  currentHeight: number,
  network: Network,
  blockTimeMs?: number | null,
): Date {
  const cutoff = getVotingDeadlineHeight(currentHeight, network);
  const blocksRemaining = cutoff - currentHeight;
  const ms = blockTimeMs ?? defaultBlockTimeMs(network);
  return new Date(Date.now() + blocksRemaining * ms);
}

export function getVotingDeadlineHeight(
  currentHeight: number,
  network: Network,
): number {
  const { votingDeadlineBlocksBeforeSb } = GOVERNANCE_PARAMS[network];
  return (
    getNextSuperblockHeight(currentHeight, network) -
    votingDeadlineBlocksBeforeSb
  );
}

export function getVotingProgress(
  currentHeight: number,
  network: Network,
): number {
  if (currentHeight <= 0) return 0;
  const prev = getPreviousSuperblockHeight(currentHeight, network);
  const cutoff = getVotingDeadlineHeight(currentHeight, network);
  const totalSpan = cutoff - prev;
  if (totalSpan <= 0) return 1;
  return Math.min(1, Math.max(0, (currentHeight - prev) / totalSpan));
}

export function getBlocksUntilVotingDeadline(
  currentHeight: number,
  network: Network,
): number {
  const cutoff = getVotingDeadlineHeight(currentHeight, network);
  return Math.max(0, cutoff - currentHeight);
}

export function getMsUntilVotingDeadline(
  currentHeight: number,
  network: Network,
  blockTimeMs?: number | null,
): number {
  const blocks = getBlocksUntilVotingDeadline(currentHeight, network);
  const ms = blockTimeMs ?? defaultBlockTimeMs(network);
  return blocks * ms;
}
