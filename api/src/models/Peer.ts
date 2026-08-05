import {GeoIpInfo} from "../services/GeoIPService";

/** Shape the indexer's peer crawler writes into the Redis `peers` hash. */
interface StoredPeer {
  addr: string;
  available: boolean;
  version: number | null;
  services: number | null;
  user_agent: string | null;
  start_height: number | null;
  last_seen: number;
  probed_at: number;
}

export class Peer {
  address: string;
  host: string;
  port: number;
  available: boolean;
  protocolVersion: number | null;
  services: number | null;
  userAgent: string | null;
  startHeight: number | null;
  lastSeen: Date;
  probedAt: Date;
  geo: GeoIpInfo | null;

  constructor(
    address: string,
    host: string,
    port: number,
    available: boolean,
    protocolVersion: number | null,
    services: number | null,
    userAgent: string | null,
    startHeight: number | null,
    lastSeen: Date,
    probedAt: Date,
    geo: GeoIpInfo | null,
  ) {
    this.address = address;
    this.host = host;
    this.port = port;
    this.available = available;
    this.protocolVersion = protocolVersion;
    this.services = services;
    this.userAgent = userAgent;
    this.startHeight = startHeight;
    this.lastSeen = lastSeen;
    this.probedAt = probedAt;
    this.geo = geo;
  }

  static fromStored(raw: string, geo: GeoIpInfo | null = null): Peer | null {
    let stored: StoredPeer;

    try {
      stored = JSON.parse(raw);
    } catch {
      return null;
    }

    if (stored?.addr == null) {
      return null;
    }

    return new Peer(
      stored.addr,
      Peer.host(stored.addr),
      Peer.port(stored.addr),
      stored.available,
      stored.version,
      stored.services,
      stored.user_agent,
      stored.start_height,
      new Date(stored.last_seen * 1000),
      new Date(stored.probed_at * 1000),
      geo,
    );
  }

  /** Host portion of an `ip:port` / `[ipv6]:port` address. */
  static host(addr: string): string {
    if (addr.startsWith('[')) {
      return addr.slice(1, addr.indexOf(']'));
    }
    return addr.slice(0, addr.lastIndexOf(':'));
  }

  static port(addr: string): number {
    return Number(addr.slice(addr.lastIndexOf(':') + 1));
  }
}