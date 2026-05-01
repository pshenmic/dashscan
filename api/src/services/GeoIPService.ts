import {readFileSync} from 'fs';
import {resolve} from 'path';
import {GEOIP_PROVIDER, GEOIP_TABLE_NAME} from "../constants";
import {CityResponse, CountryResponse, Reader} from "mmdb-lib";

export interface IpInfo {
  ipv4: string;
  countryCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

export default class GeoIPService {
  private reader: Reader<CountryResponse>

  constructor() {
    const csvPath = resolve(
      require.resolve(`${GEOIP_PROVIDER}/package.json`),
      '..',
      GEOIP_TABLE_NAME,
    );

    const data = readFileSync(csvPath);

    this.reader = new Reader<CityResponse>(data)
  }

  lookup = (ipv4: string): IpInfo | null => {
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