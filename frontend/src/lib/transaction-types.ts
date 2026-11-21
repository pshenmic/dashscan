export const TRANSACTION_TYPES = [
  {
    id: 0,
    name: "CLASSIC",
    label: "Normal",
    description: "Standard transaction without a special transaction payload.",
    family: "neutral",
  },
  {
    id: 1,
    name: "PROVIDER_REGISTRATION",
    label: "ProRegTx",
    description: "Registers a masternode provider.",
    family: "provider",
  },
  {
    id: 2,
    name: "PROVIDER_UPDATE_SERVICE",
    label: "ProUpServTx",
    description: "Updates a masternode provider's service information.",
    family: "provider",
  },
  {
    id: 3,
    name: "PROVIDER_UPDATE_REGISTRAR",
    label: "ProUpRegTx",
    description: "Updates a masternode provider's registrar information.",
    family: "provider",
  },
  {
    id: 4,
    name: "PROVIDER_UPDATE_REVOCATION",
    label: "ProUpRevTx",
    description: "Revokes a masternode provider's service.",
    family: "provider",
  },
  {
    id: 5,
    name: "COINBASE",
    label: "Coinbase",
    description:
      "Special coinbase transaction containing block reward and chain commitments.",
    family: "reward",
  },
  {
    id: 6,
    name: "QUORUM_COMMITMENT",
    label: "Quorum Commitment",
    description: "Records a quorum commitment on the chain.",
    family: "consensus",
  },
  {
    id: 7,
    name: "MASTERNODE_HARD_FORK_SIGNAL",
    label: "MNHF Signal",
    description: "Masternode hard fork signal.",
    family: "consensus",
  },
  {
    id: 8,
    name: "ASSET_LOCK",
    label: "Asset Lock",
    description: "Locks DASH on Core for use as credits on Platform.",
    family: "asset",
  },
  {
    id: 9,
    name: "ASSET_UNLOCK",
    label: "Asset Unlock",
    description: "Unlocks DASH on Core when withdrawing from Platform.",
    family: "asset",
  },
  {
    id: 10,
    name: "PROVIDER_DISSOLVE",
    label: "ProDisTx",
    description: "Provider dissolve transaction.",
    family: "provider",
  },
  {
    id: 11,
    name: "PROVIDER_UPDATE_SHARE",
    label: "ProUpShareTx",
    description: "Provider share update transaction.",
    family: "provider",
  },
  {
    id: 12,
    name: "PROVIDER_UPDATE_SHARED_REGISTRAR",
    label: "ProUpSharedRegTx",
    description: "Provider shared registrar update transaction.",
    family: "provider",
  },
] as const;

export const TRANSACTION_TYPE_VALUES = TRANSACTION_TYPES.map(
  (type) => type.name,
);
export type TransactionTypeFilter = (typeof TRANSACTION_TYPES)[number]["name"];
type TransactionType = string | number | null | undefined;

const FAMILY_STYLES = {
  neutral: "border-foreground/12 bg-foreground/5 text-foreground/70",
  provider:
    "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  reward:
    "border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  consensus:
    "border-cyan-500/20 bg-cyan-500/10 text-cyan-800 dark:text-cyan-300",
  asset: "border-teal-500/20 bg-teal-500/10 text-teal-800 dark:text-teal-300",
};

export function getTransactionType(type: TransactionType) {
  return TRANSACTION_TYPES.find(
    (entry) => entry.id === type || entry.name === type,
  );
}

export function txTypeNum(type: TransactionType): number {
  return getTransactionType(type)?.id ?? (typeof type === "number" ? type : -1);
}

export function getTxTypeLabel(type: TransactionType): string {
  return (
    getTransactionType(type)?.label ??
    (type == null || type === ""
      ? "Unknown"
      : typeof type === "number"
        ? `Type ${type}`
        : type)
  );
}

export function getTxTypeBadgeStyle(type: TransactionType): string {
  return FAMILY_STYLES[getTransactionType(type)?.family ?? "neutral"];
}
