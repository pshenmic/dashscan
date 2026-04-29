import { readFileSync } from 'fs';
import { resolve } from 'path';
import {GEOIP_PROVIDER, GEOIP_TABLE_NAME} from "../constants";

interface IPv4Range {
  start: number;
  end: number;
  country: string;
}

export default class GeoIPService {
  private ipv4Ranges: IPv4Range[] = [];

  constructor() {
    const csvPath = resolve(
      require.resolve(`${GEOIP_PROVIDER}/package.json`),
      '..',
      GEOIP_TABLE_NAME,
    );

    const data = readFileSync(csvPath, 'utf8');
    const lines = data.split('\n');

    this.ipv4Ranges = new Array(lines.length);
    let count = 0;

    for (const line of lines) {
      if (!line) continue;
      const [start, end, country] = line.split(',');
      this.ipv4Ranges[count++] = {
        start: Number(start),
        end: Number(end),
        country,
      };
    }

    this.ipv4Ranges.length = count;
  }

  private ipv4ToInt = (ip: string): number | null => {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;

    let result = 0;
    for (const part of parts) {
      const n = Number(part);
      if (!Number.isInteger(n) || n < 0 || n > 255) return null;
      result = result * 256 + n;
    }
    return result;
  };

  lookup = (ip: string): string | null => {
    const num = this.ipv4ToInt(ip);
    if (num === null) return null;

    let lo = 0;
    let hi = this.ipv4Ranges.length - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const range = this.ipv4Ranges[mid];
      if (num < range.start) hi = mid - 1;
      else if (num > range.end) lo = mid + 1;
      else return range.country;
    }
    return null;
  };
}