export type Currency = 'usd' | 'btc';

export interface DataPoint {
  timestamp: number;
  value: number;
}

export interface CurrentData {
  price: number;
  marketCap: number | null;
  volume: number | null;
}

export interface MarketChart {
  prices: DataPoint[];
  marketCaps: DataPoint[];
  volumes: DataPoint[];
}

export interface MarketCacheEntry<T> {
  value: T;
  fetchedAt: number;
}
