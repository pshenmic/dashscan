export interface XpubSummaryObject {
  balance?: string;
  received?: string;
  sent?: string;
  txCount?: number;
  addressCount?: number;
  usedAddressCount?: number;
  nextUnused?: { receive: number | null; change: number | null };
}

export interface XpubSummaryRow {
  balance?: string;
  received?: string;
  sent?: string;
  tx_count?: string;
}

export interface XpubAddressObject {
  address?: string;
  branch?: number;
  index?: number;
  used?: boolean;
}

export interface DerivedAddress {
  address: string;
  branch: number;
  index: number;
  used: boolean;
  addressId: number | null;
}

export interface ResolvedXpub {
  addresses: DerivedAddress[];
  addressIds: number[];
  nextUnused: Record<number, number | null>;
}

export interface XpubBranchCache {
  derived: string[];
  ids: Record<string, number>;
}

export interface ScannedBranch {
  branch: number;
  addresses: DerivedAddress[];
  addressIds: number[];
  firstUnused: number | null;
}
