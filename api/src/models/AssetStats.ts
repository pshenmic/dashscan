export interface AssetStatsRow {
  asset_lock_count?: string | number | null;
  asset_lock_amount?: string | null;
  asset_unlock_count?: string | number | null;
  asset_unlock_amount?: string | null;
}

export default class AssetStats {
  assetLock: { count: number; amount: string };
  assetUnlock: { count: number; amount: string };

  constructor(assetLockCount?: number, assetLockAmount?: string, assetUnlockCount?: number, assetUnlockAmount?: string) {
    this.assetLock = { count: assetLockCount ?? 0, amount: assetLockAmount ?? '0' };
    this.assetUnlock = { count: assetUnlockCount ?? 0, amount: assetUnlockAmount ?? '0' };
  }

  static fromRow({asset_lock_count, asset_lock_amount, asset_unlock_count, asset_unlock_amount}: AssetStatsRow): AssetStats {
    return new AssetStats(Number(asset_lock_count ?? 0), asset_lock_amount ?? '0', Number(asset_unlock_count ?? 0), asset_unlock_amount ?? '0');
  }
}
