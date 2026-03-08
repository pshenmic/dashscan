const CURRENT_CACHE_TTL_MS = 60 * 60 * 1000;
const HISTORICAL_CACHE_TTL_MS = 60 * 60 * 1000;

export type Currency = 'usd' | 'btc';

export interface DataPoint {
  timestamp: number;
  value: number;
}

interface CurrentData {
  price: number;
  marketCap: number | null;
  volume: number | null;
}

interface MarketChart {
  prices: DataPoint[];
  marketCaps: DataPoint[];
  volumes: DataPoint[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=dash&vs_currencies=${currency}&include_market_cap=true&include_24hr_vol=true`,
  );
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  const data = await res.json() as { dash: Record<string, number> };
  return {
    price: data.dash[currency],
    marketCap: data.dash[`${currency}_market_cap`],
    volume: data.dash[`${currency}_24h_vol`],
  };
};

const krakenCurrentPrice = async (currency: Currency): Promise<number> => {
  const pair = currency === 'btc' ? 'DASHXBT' : 'DASHUSD';
  const res = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${pair}`);
  if (!res.ok) throw new Error(`Kraken error: ${res.status}`);
  const data = await res.json() as { result: Record<string, { c: string[] }> };
  return parseFloat(Object.values(data.result)[0].c[0]);
};

// ── Historical providers ──────────────────────────────────────────────────────

const coingeckoHistoricalChart = async (currency: Currency): Promise<MarketChart> => {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/dash/market_chart?vs_currency=${currency}&days=1`,
  );
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  const data = await res.json() as {
    prices: [number, number][];
    market_caps: [number, number][];
    total_volumes: [number, number][];
  };
  return {
    prices: compactToHourly(data.prices),
    marketCaps: compactToHourly(data.market_caps),
    volumes: compactToHourly(data.total_volumes),
  };
};

const krakenHistoricalUsd = async (): Promise<MarketChart> => {
  const res = await fetch(`https://api.kraken.com/0/public/OHLC?pair=DASHUSD&interval=60`);
  if (!res.ok) throw new Error(`Kraken error: ${res.status}`);
  const data = await res.json() as {
    result: Record<string, [number, string, string, string, string, string, string, number][]>;
  };
  const candles = Object.values(data.result)[0].slice(-24);
  return {
    prices: candles.map(([timestamp, , , , close]) => ({ timestamp, value: parseFloat(close) })),
    marketCaps: [],
    volumes: candles.map(([timestamp, , , , , , volume]) => ({ timestamp, value: parseFloat(volume as unknown as string) })),
  };
};

// ── Service ───────────────────────────────────────────────────────────────────

export default class MarketService {
  private cachedCurrentData: Partial<Record<Currency, CurrentData>> = {};
  private currentCacheExpiresAt: Partial<Record<Currency, number>> = {};

  private cachedChart: Partial<Record<Currency, MarketChart>> = {};
  private chartCacheExpiresAt: Partial<Record<Currency, number>> = {};

  // ── Current ──────────────────────────────────────────────────────────────

  private getCurrentData = async (currency: Currency): Promise<CurrentData> => {
    if (this.cachedCurrentData[currency] !== undefined && Date.now() < (this.currentCacheExpiresAt[currency] ?? 0)) {
      return this.cachedCurrentData[currency]!;
    }

    try {
      const data = await coingeckoCurrent(currency);
      this.cachedCurrentData[currency] = data;
      this.currentCacheExpiresAt[currency] = Date.now() + CURRENT_CACHE_TTL_MS;
      return data;
    } catch {
      // CoinGecko failed — fall back to Kraken for price only
    }

    const price = await krakenCurrentPrice(currency);
    const data: CurrentData = { price, marketCap: null, volume: null };
    this.cachedCurrentData[currency] = data;
    this.currentCacheExpiresAt[currency] = Date.now() + CURRENT_CACHE_TTL_MS;
    return data;
  };

  getCurrentPrice = async (currency: Currency): Promise<number> =>
    (await this.getCurrentData(currency)).price;

  getCurrentMarketCap = async (currency: Currency): Promise<number> => {
    const data = await this.getCurrentData(currency);
    if (data.marketCap === null) throw new Error('Market cap unavailable');
    return data.marketCap;
  };

  getCurrentVolume = async (currency: Currency): Promise<number> => {
    const data = await this.getCurrentData(currency);
    if (data.volume === null) throw new Error('Volume unavailable');
    return data.volume;
  };

  // ── Historical ────────────────────────────────────────────────────────────

  private getHistoricalChart = async (currency: Currency): Promise<MarketChart> => {
    if (this.cachedChart[currency] !== undefined && Date.now() < (this.chartCacheExpiresAt[currency] ?? 0)) {
      return this.cachedChart[currency]!;
    }

    try {
      const chart = await coingeckoHistoricalChart(currency);
      this.cachedChart[currency] = chart;
      this.chartCacheExpiresAt[currency] = Date.now() + HISTORICAL_CACHE_TTL_MS;
      return chart;
    } catch (e) {
      console.error(e);
    }

    if (currency !== 'usd') throw new Error('Historical chart unavailable');

    const chart = await krakenHistoricalUsd();
    this.cachedChart[currency] = chart;
    this.chartCacheExpiresAt[currency] = Date.now() + HISTORICAL_CACHE_TTL_MS;
    return chart;
  };

  getHistoricalPrices = async (currency: Currency): Promise<DataPoint[]> =>
    (await this.getHistoricalChart(currency)).prices;

  getHistoricalMarketCaps = async (currency: Currency): Promise<DataPoint[]> =>
    (await this.getHistoricalChart(currency)).marketCaps;

  getHistoricalVolumes = async (currency: Currency): Promise<DataPoint[]> =>
    (await this.getHistoricalChart(currency)).volumes;
}