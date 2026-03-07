const CURRENT_CACHE_TTL_MS = 60 * 60 * 1000;
const HISTORICAL_CACHE_TTL_MS = 60 * 60 * 1000;

export interface PricePoint {
  timestamp: number;
  usd: number;
}

type CurrentPriceProvider = () => Promise<number>;
type HistoricalPriceProvider = () => Promise<PricePoint[]>;

// ── Current price providers ───────────────────────────────────────────────────

const coingeckoCurrent: CurrentPriceProvider = async () => {
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=dash&vs_currencies=usd');
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  const data = await res.json() as { dash: { usd: number } };
  return data.dash.usd;
};

const krakenCurrent: CurrentPriceProvider = async () => {
  const res = await fetch('https://api.kraken.com/0/public/Ticker?pair=DASHUSD');
  if (!res.ok) throw new Error(`Kraken error: ${res.status}`);
  const data = await res.json() as { result: { DASHUSD: { c: string[] } } };
  return parseFloat(data.result.DASHUSD.c[0]);
};

// ── Historical price providers (hourly, last 24h) ─────────────────────────────

const coingeckoHistorical: HistoricalPriceProvider = async () => {
  const res = await fetch('https://api.coingecko.com/api/v3/coins/dash/market_chart?vs_currency=usd&days=1&interval=hourly');
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  const data = await res.json() as { prices: [number, number][] };
  return data.prices.map(([timestampMs, usd]) => ({ timestamp: Math.floor(timestampMs / 1000), usd }));
};

const krakenHistorical: HistoricalPriceProvider = async () => {
  const res = await fetch('https://api.kraken.com/0/public/OHLC?pair=DASHUSD&interval=60');
  if (!res.ok) throw new Error(`Kraken error: ${res.status}`);
  const data = await res.json() as { result: { DASHUSD: [number, string, string, string, string, string, string, number][] } };
  const candles = data.result.DASHUSD.slice(-24);
  return candles.map(([timestamp, , , , close]) => ({ timestamp, usd: parseFloat(close) }));
};

// ── Service ───────────────────────────────────────────────────────────────────

const currentProviders: CurrentPriceProvider[] = [coingeckoCurrent, krakenCurrent];
const historicalProviders: HistoricalPriceProvider[] = [coingeckoHistorical, krakenHistorical];

export default class PriceService {
  private cachedCurrentPrice: number | null = null;
  private currentCacheExpiresAt: number = 0;

  private cachedHistoricalPrices: PricePoint[] | null = null;
  private historicalCacheExpiresAt: number = 0;

  getCurrentPrice = async (): Promise<number> => {
    if (this.cachedCurrentPrice !== null && Date.now() < this.currentCacheExpiresAt) {
      return this.cachedCurrentPrice;
    }

    for (const provider of currentProviders) {
      try {
        const price = await provider();
        this.cachedCurrentPrice = price;
        this.currentCacheExpiresAt = Date.now() + CURRENT_CACHE_TTL_MS;
        return price;
      } catch {
        // try next provider
      }
    }

    throw new Error('All price providers failed');
  };

  getHistoricalPrices = async (): Promise<PricePoint[]> => {
    if (this.cachedHistoricalPrices !== null && Date.now() < this.historicalCacheExpiresAt) {
      return this.cachedHistoricalPrices;
    }

    for (const provider of historicalProviders) {
      try {
        const prices = await provider();
        this.cachedHistoricalPrices = prices;
        this.historicalCacheExpiresAt = Date.now() + HISTORICAL_CACHE_TTL_MS;
        return prices;
      } catch {
        // try next provider
      }
    }

    throw new Error('All historical price providers failed');
  };
}