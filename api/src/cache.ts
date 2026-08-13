import Redis from 'ioredis';

// Shared across API instances, so N instances make one RPC call, not N.
export class Cache {
  private redis: Redis;
  private prefix: string;

  constructor(redis: Redis, prefix = 'cache:') {
    this.redis = redis;
    this.prefix = prefix;
  }

  private keyFor = (key: string): string => `${this.prefix}${key}`;

  get = async <T>(key: string): Promise<T | null> => {
    const raw = await this.redis.get(this.keyFor(key));

    if (raw == null) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      // Drop a poisoned entry rather than failing the request on it.
      await this.delete(key);
      return null;
    }
  };

  set = async <T>(key: string, value: T, ttlMs?: number): Promise<void> => {
    const raw = JSON.stringify(value);

    if (ttlMs != null && ttlMs > 0) {
      await this.redis.set(this.keyFor(key), raw, 'PX', Math.floor(ttlMs));
    } else {
      await this.redis.set(this.keyFor(key), raw);
    }
  };

  delete = async (key: string): Promise<void> => {
    await this.redis.del(this.keyFor(key));
  };
}
