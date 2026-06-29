import Redis from 'ioredis';
import {Peer} from "../models/Peer";
import PaginatedResultSet from "../models/PaginatedResultSet";
import GeoIPService from "../services/GeoIPService";
import {REDIS_AVAILABLE_KEY, REDIS_UNAVAILABLE_KEY} from "../constants";

export default class PeersDAO {
  redis: Redis;
  geoIPService: GeoIPService;

  constructor(redis: Redis, geoIPService: GeoIPService) {
    this.redis = redis;
    this.geoIPService = geoIPService;
  }

  /**
   * Peers from the crawler's latest round, geo-enriched and paginated like the
   * masternodes map. The `available` flag selects which Redis set(s) to read
   * (omitted: both); `country` filters by geo country code.
   */
  getPeers = async (
    page: number | undefined,
    limit: number | undefined,
    order: string = 'asc',
    available?: boolean,
    country?: string,
  ): Promise<PaginatedResultSet<Peer>> => {
    const effectivePage = page ?? 1;
    const effectiveLimit = limit ?? 10;
    const fromRank = (effectivePage - 1) * effectiveLimit;

    const keys = available === true
      ? [REDIS_AVAILABLE_KEY]
      : available === false
        ? [REDIS_UNAVAILABLE_KEY]
        : [REDIS_AVAILABLE_KEY, REDIS_UNAVAILABLE_KEY];

    const raw = (await Promise.all(keys.map(key => this.redis.hvals(key)))).flat();

    let peers = raw
      .map(value => {
        const peer = Peer.fromStored(value);

        if (peer == null) {
          return null;
        }

        try {
          peer.geo = this.geoIPService.lookup(peer.host);
        } catch {
          // Non-IPv4 / unknown address — leave geo unset rather than failing.
          peer.geo = null;
        }

        return peer;
      })
      .filter((peer): peer is Peer => peer != null);

    if (country != null) {
      peers = peers.filter(peer => peer.geo?.countryCode === country);
    }

    const direction = order === 'desc' ? -1 : 1;
    peers.sort((a, b) => (a.lastSeen.getTime() - b.lastSeen.getTime()) * direction);

    const total = peers.length;
    const resultSet = (limit != null || page != null)
      ? peers.slice(fromRank, fromRank + effectiveLimit)
      : peers;

    return new PaginatedResultSet(
      resultSet,
      effectivePage,
      limit != null ? effectiveLimit : total,
      total,
    );
  };
}