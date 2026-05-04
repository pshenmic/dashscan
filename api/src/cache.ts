import {UtxoInfoRPC} from "./dashcoreRPC";

interface CacheStorage {
  utxoInfo?: UtxoInfoRPC;
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