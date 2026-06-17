import {UtxoInfoRPC} from "./dashcoreRPC";

interface CacheStorage {
  utxoInfo?: UtxoInfoRPC;
  geoipStorage?: { [key: string | number]: any };
  // hashMap: outpoint → proTxHash. weightMap: outpoint → governance vote weight
  // (Evo/HPMN = 4, Regular = 1). Cached together so they never desync.
  protxOutpoint?: {
    hashMap: Record<string, string>;
    weightMap: Record<string, number>;
  };
}

export class Cache {
  storage: CacheStorage = {};

  set = <K extends keyof CacheStorage>(key: K, value: CacheStorage[K], timeout: number) => {
    this.storage[key] = value

    if (timeout) {
      setTimeout(() => this.delete(key), timeout)
    }
  }

  delete = <K extends keyof CacheStorage>(key: K) => {
    this.storage[key] = undefined
  }

  get = <K extends keyof CacheStorage>(key: K): CacheStorage[K] => {
    return this.storage[key]
  }
}