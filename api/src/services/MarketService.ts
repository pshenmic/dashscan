import {Cache} from '../cache';
import MarketDataUnavailableError from '../errors/MarketDataUnavailableError';
import {Currency, CurrentData, DataPoint, MarketCacheEntry, MarketChart} from '../types/market';
import {
  MARKET_CACHE_LIFE_TIME,
  MARKET_FAILURE_LIFE_TIME,
  MARKET_REQUEST_TIMEOUT,
  MARKET_STALE_LIFE_TIME,
} from '../constants';

export {Currency, DataPoint} from '../types/market';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fetchJson = async <T>(url: string, provider: string): Promise<T> => {
  const res = await fetch(url, {signal: AbortSignal.timeout(MARKET_REQUEST_TIMEOUT)});

  if (!res.ok) {
    throw new Error(`${provider} error: ${res.status}`);
  }

  return await res.json() as T;
};

function compactToHourly(points: [number, number][]): DataPoint[] {
  const byHour = new Map<number, number>();
  for (const [timestampMs, value] of points) {
    const hourTs = Math.floor(timestampMs / 1000 / 3600) * 3600;
    byHour.set(hourTs, value);
  }
  return Array.from(byHour.entries())
    .sort(([a], [b]) => a - b)
    .map(([timestamp, value]) => ({ timestamp, value }));
}

// ── Current providers ─────────────────────────────────────────────────────────

const coingeckoCurrent = async (currency: Currency): Promise<CurrentData> => {
  const data = await fetchJson<{ dash?: Record<string, number> }>(
    `https://api.coingecko.com/api/v3/simple/price?ids=dash&vs_currencies=${currency}&include_market_cap=true&include_24hr_vol=true`,
    'CoinGecko',
  );

  const dash = data.dash;

  if (dash?.[currency] == null) {
    throw new Error(`CoinGecko returned no ${currency} price for dash`);
  }

  return {
    price: dash[currency],
    marketCap: dash[`${currency}_market_cap`] ?? null,
    volume: dash[`${currency}_24h_vol`] ?? null,
  };
};

const krakenLastPrice = async (pair: string): Promise<number> => {
  const data = await fetchJson<{
    error?: string[];
    result?: Record<string, { c?: string[] }>;
  }>(`https://api.kraken.com/0/public/Ticker?pair=${pair}`, 'Kraken');

  // Kraken answers 200 with the failure in the body, so the status proves nothing.
  if (data.error != null && data.error.length > 0) {
    throw new Error(`Kraken error: ${data.error.join(', ')}`);
  }

  const price = parseFloat(Object.values(data.result ?? {})[0]?.c?.[0]);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Kraken returned no ticker for ${pair}`);
  }

  return price;
};

// Kraken quotes DASH against USD and EUR only, so BTC has to go through a cross.
const krakenCurrentPrice = async (currency: Currency): Promise<number> => {
  if (currency === 'usd') {
    return await krakenLastPrice('DASHUSD');
  }

  const [dashUsd, btcUsd] = await Promise.all([
    krakenLastPrice('DASHUSD'),
    krakenLastPrice('XBTUSD'),
  ]);

  return dashUsd / btcUsd;
};

// ── Historical providers ──────────────────────────────────────────────────────

const coingeckoHistoricalChart = async (currency: Currency): Promise<MarketChart> => {
  const data = await fetchJson<{
    prices?: [number, number][];
    market_caps?: [number, number][];
    total_volumes?: [number, number][];
  }>(
    `https://api.coingecko.com/api/v3/coins/dash/market_chart?vs_currency=${currency}&days=1`,
    'CoinGecko',
  );

  if (data.prices == null) {
    throw new Error('CoinGecko returned no chart for dash');
  }

  return {
    prices: compactToHourly(data.prices),
    marketCaps: compactToHourly(data.market_caps ?? []),
    volumes: compactToHourly(data.total_volumes ?? []),
  };
};

const krakenHistoricalUsd = async (): Promise<MarketChart> => {
  const data = await fetchJson<{
    error?: string[];
    result?: Record<string, [number, string, string, string, string, string, string, number][] | number>;
  }>('https://api.kraken.com/0/public/OHLC?pair=DASHUSD&interval=60', 'Kraken');

  if (data.error != null && data.error.length > 0) {
    throw new Error(`Kraken error: ${data.error.join(', ')}`);
  }

  // The result holds the candles under a normalised pair name alongside a
  // scalar `last`, and nothing promises which of the two comes first.
  const entry = Object.entries(data.result ?? {}).find(([key]) => key !== 'last');
  const candles = Array.isArray(entry?.[1]) ? entry[1] : null;

  if (candles == null || candles.length === 0) {
    throw new Error('Kraken returned no candles for DASHUSD');
  }

  const window = candles.slice(-24);

  return {
    prices: window.map(([timestamp, , , , close]) => ({ timestamp, value: parseFloat(close) })),
    marketCaps: [],
    volumes: window.map(([timestamp, , , , , , volume]) => ({ timestamp, value: parseFloat(volume) })),
  };
};

// ── Service ───────────────────────────────────────────────────────────────────

export default class MarketService {
  private cache: Cache;
  private inFlight = new Map<string, Promise<unknown>>();

  constructor(cache: Cache) {
    this.cache = cache;
  }

  /**
   * Freshness is the entry's own age, not its Redis expiry, so a value that has
   * aged out is still there to answer with when the upstream cannot be reached.
   */
  private load = async <T>(key: string, ttlMs: number, fetchValue: () => Promise<T>): Promise<T> => {
    const cached = await this.cache.get<MarketCacheEntry<T>>(key);

    if (cached != null && Date.now() - cached.fetchedAt < ttlMs) {
      return cached.value;
    }

    // A recent failure short-circuits the retry, so a lasting outage costs one
    // attempt per marker rather than one per request.
    if (await this.cache.get(`${key}:down`) != null) {
      if (cached != null) {
        return cached.value;
      }

      throw new Error(`Upstream for ${key} is down`);
    }

    const running = this.inFlight.get(key) as Promise<T> | undefined;

    if (running != null) {
      return await running;
    }

    const refresh = fetchValue()
      .then(async (value) => {
        await this.cache.set(key, {value, fetchedAt: Date.now()}, MARKET_STALE_LIFE_TIME);
        return value;
      })
      .catch(async (e) => {
        console.error(e);

        await this.cache.set(`${key}:down`, true, MARKET_FAILURE_LIFE_TIME);

        if (cached != null) {
          return cached.value;
        }

        throw e;
      })
      .finally(() => this.inFlight.delete(key));

    this.inFlight.set(key, refresh);

    return await refresh;
  };

  // ── Current ──────────────────────────────────────────────────────────────

  private getCurrentData = async (currency: Currency): Promise<CurrentData> => {
    try {
      return await this.load(
        `market:current:${currency}`,
        MARKET_CACHE_LIFE_TIME,
        () => coingeckoCurrent(currency),
      );
    } catch {
      // Kept under its own key: a price-only fallback must not evict a market
      // cap that is only stale.
    }

    try {
      return await this.load(`market:fallback:${currency}`, MARKET_CACHE_LIFE_TIME, async () => ({
        price: await krakenCurrentPrice(currency),
        marketCap: null,
        volume: null,
      }));
    } catch {
      throw new MarketDataUnavailableError('Market data is not available');
    }
  };

  getCurrentPrice = async (currency: Currency): Promise<number> =>
    (await this.getCurrentData(currency)).price;

  getCurrentMarketCap = async (currency: Currency): Promise<number> => {
    const {marketCap} = await this.getCurrentData(currency);

    if (marketCap === null) {
      throw new MarketDataUnavailableError('Market cap is not available');
    }

    return marketCap;
  };

  getCurrentVolume = async (currency: Currency): Promise<number> => {
    const {volume} = await this.getCurrentData(currency);

    if (volume === null) {
      throw new MarketDataUnavailableError('Volume is not available');
    }

    return volume;
  };

  // ── Historical ────────────────────────────────────────────────────────────

  private getHistoricalChart = async (currency: Currency): Promise<MarketChart> => {
    try {
      return await this.load(
        `market:chart:${currency}`,
        MARKET_CACHE_LIFE_TIME,
        () => coingeckoHistoricalChart(currency),
      );
    } catch {
      // Kraken carries DASHUSD candles only.
    }

    if (currency !== 'usd') {
      throw new MarketDataUnavailableError('Historical chart is not available');
    }

    try {
      return await this.load('market:chart:fallback:usd', MARKET_CACHE_LIFE_TIME, krakenHistoricalUsd);
    } catch {
      throw new MarketDataUnavailableError('Historical chart is not available');
    }
  };

  getHistoricalPrices = async (currency: Currency): Promise<DataPoint[]> =>
    (await this.getHistoricalChart(currency)).prices;

  getHistoricalMarketCaps = async (currency: Currency): Promise<DataPoint[]> =>
    (await this.getHistoricalChart(currency)).marketCaps;

  getHistoricalVolumes = async (currency: Currency): Promise<DataPoint[]> =>
    (await this.getHistoricalChart(currency)).volumes;
}
