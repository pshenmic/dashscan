import Redis from 'ioredis';
import {Peer} from "../models/Peer";
import {PeerUserAgent} from "../models/PeerUserAgent";
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
   * (omitted: both); `country` filters by geo country code, `userAgent` by a
   * regular expression against the advertised user agent.
   */
  getPeers = async (
    page: number,
    limit: number | undefined,
    order: string = 'asc',
    available?: boolean,
    country?: string,
    userAgent?: RegExp,
    ip?: string,
  ): Promise<PaginatedResultSet<Peer>> => {
    const keys = available === true
      ? [REDIS_AVAILABLE_KEY]
      : available === false
        ? [REDIS_UNAVAILABLE_KEY]
        : [REDIS_AVAILABLE_KEY, REDIS_UNAVAILABLE_KEY];

    const peers = this.filterPeers(await this.loadPeers(keys, true), country, userAgent, ip);

    const direction = order === 'desc' ? -1 : 1;
    peers.sort((a, b) => (a.lastSeen.getTime() - b.lastSeen.getTime()) * direction);

    return this.paginate(peers, page, limit);
  };

  /**
   * Distinct user agents advertised by the peers of the crawler's latest round,
   * ordered by how many peers run each of them. Only available peers carry a
   * user agent, so unavailable ones are never counted.
   */
  getUserAgents = async (
    page: number,
    limit: number | undefined,
    order: string = 'desc',
  ): Promise<PaginatedResultSet<PeerUserAgent>> => {
    const peers = await this.loadPeers([REDIS_AVAILABLE_KEY], false);

    const counts = new Map<string, number>();

    for (const peer of peers) {
      if (peer.userAgent == null) {
        continue;
      }

      counts.set(peer.userAgent, (counts.get(peer.userAgent) ?? 0) + 1);
    }

    const direction = order === 'asc' ? -1 : 1;
    const userAgents = [...counts.entries()]
      .map(([agent, count]) => new PeerUserAgent(agent, count))
      .sort((a, b) => (b.count - a.count) * direction || a.userAgent.localeCompare(b.userAgent));

    return this.paginate(userAgents, page, limit);
  };

  private loadPeers = async (keys: string[], withGeo: boolean): Promise<Peer[]> => {
    const raw = (await Promise.all(keys.map(key => this.redis.hvals(key)))).flat();

    return raw
      .map(value => {
        const peer = Peer.fromStored(value);

        if (peer == null) {
          return null;
        }

        if (withGeo) {
          try {
            peer.geo = this.geoIPService.lookup(peer.host);
          } catch {
            // Non-IPv4 / unknown address — leave geo unset rather than failing.
            peer.geo = null;
          }
        }

        return peer;
      })
      .filter((peer): peer is Peer => peer != null);
  };

  private filterPeers = (peers: Peer[], country?: string, userAgent?: RegExp, ip?: string): Peer[] => {
    let filtered = peers;

    if (country != null) {
      filtered = filtered.filter(peer => peer.geo?.countryCode === country);
    }

    if (userAgent != null) {
      filtered = filtered.filter(peer => peer.userAgent != null && userAgent.test(peer.userAgent));
    }

    if (ip != null) {
      filtered = filtered.filter(peer => peer.host === ip);
    }

    return filtered;
  };

  private paginate = <T>(items: T[], page: number, limit: number | undefined): PaginatedResultSet<T> => {
    const total = items.length;

    if (limit == null) {
      return new PaginatedResultSet(items, page, total, total);
    }

    return new PaginatedResultSet(items.slice((page - 1) * limit, page * limit), page, limit, total);
  };
}