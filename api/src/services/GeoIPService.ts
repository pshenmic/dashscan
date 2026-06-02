import {readFileSync} from 'fs';
import {resolve} from 'path';
import {GEOIP_PROVIDER, GEOIP_TABLE_NAME} from "../constants";
import {CityResponse, CountryResponse, Reader} from "mmdb-lib";
import {Cache as mmdbCacheType} from "mmdb-lib/lib/types";
import {Cache} from "../cache";

export interface GeoIpInfo {
  ipv4: string;
  countryCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

function geoIpDialectFactory (cache: Cache): mmdbCacheType {
  const cacheStorage = cache.get('geoipStorage')
  return {
    get: (key: string | number): any => cacheStorage[key],
    set: (key: string | number, value: any): any => cacheStorage[key] = value,
  }
}

export default class GeoIPService {
  private reader: Reader<CountryResponse>

  constructor(cache: Cache) {
    cache.set('geoipStorage', {}, undefined)

    const cacheDialect = geoIpDialectFactory(cache);

    const csvPath = resolve(
      require.resolve(`${GEOIP_PROVIDER}/package.json`),
      '..',
      GEOIP_TABLE_NAME,
    );

    const data = readFileSync(csvPath);

    this.reader = new Reader<CityResponse>(data, {cache: cacheDialect})
  }

  lookup = (ipv4: string): GeoIpInfo | null => {
    if(!ipv4) {
      throw new Error('you must specify a valid IP address');
    }

    // incorrect typings in mmdb-lib. Using any
    const response = this.reader.get(ipv4) as any

    return {
      ipv4,
      countryCode: response.country_code ?? null,
      city: response.city ?? null,
      latitude: response.latitude ?? null,
      longitude: response.longitude ?? null,
    }
  };
}