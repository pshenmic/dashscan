import {Knex} from 'knex';
import Masternode from '../models/Masternode';
import PaginatedResultSet from '../models/PaginatedResultSet';
import GeoIPService, {GeoIpInfo} from "../services/GeoIPService";
import MasternodeStats, {MasternodeStatsRow} from "../models/MasternodeStats";

export default class MasternodesDAO {
  private knex: Knex;
  private geoIPService: GeoIPService;

  constructor(knex: Knex, geoIPService: GeoIPService) {
    this.knex = knex;
    this.geoIPService = geoIPService;
  }

  getMasternodes = async (
    page: number | undefined,
    limit: number | undefined,
    order: string,
    status?: string,
    type?: string,
    lastPaidBefore?: number,
    hasPenalty?: boolean,
    country?: string,
  ): Promise<PaginatedResultSet<Masternode>> => {
    const effectivePage = page ?? 1;
    const effectiveLimit = limit ?? 10;
    const fromRank = (effectivePage - 1) * effectiveLimit;

    let proTxHashFilter: string[] | null = null;

    // getting ip location if specified country filter (faster than call and then filter
    if (country != null) {
      const ipRows = await this.knex('masternodes').select('pro_tx_hash', 'address');

      proTxHashFilter = ipRows
        .filter(row => row.address !== '[::]:0')
        .filter(row => {
          const [ip] = row.address.split(':');

          return this.geoIPService.lookup(ip)?.countryCode === country;
        })
        .map(row => row.pro_tx_hash);

      if (proTxHashFilter.length === 0) {
        return new PaginatedResultSet([], effectivePage, effectiveLimit, 0);
      }
    }

    const rows = await this.knex('masternodes')
      .select(
        'pro_tx_hash',
        'address',
        'payee',
        'status',
        'type',
        'pos_penalty_score',
        'consecutive_payments',
        'last_paid_time',
        'last_paid_block',
        'owner_address',
        'voting_address',
        'collateral_address',
        'pub_key_operator',
        'created_at',
        'updated_at',
      )
      .select(this.knex.raw('count(*) over() as total_count'))
      .modify((builder) => {
        if (status != null) builder.where('status', status);
        if (type != null) builder.whereRaw('LOWER(type) = ?', [type.toLowerCase()]);
        if (lastPaidBefore != null) builder.where('last_paid_time', '>', lastPaidBefore);
        if (hasPenalty != null) builder.where('pos_penalty_score', hasPenalty ? '>' : '=', 0);
        if (proTxHashFilter != null) builder.whereIn('pro_tx_hash', proTxHashFilter);
      })
      .orderBy('last_paid_block', order)
      .modify((builder) => {
        if (limit!=null || page!=null) builder.limit(effectiveLimit).offset(fromRank);
      });

    const [row] = rows;

    const resultSet = rows.map(row => {
      const masternode = Masternode.fromRow(row)

      let geoIpInfo: GeoIpInfo | undefined = undefined

      if (masternode.address != null && masternode.address !== '[::]:0') {
        const [ip] = masternode.address.split(':')

        // second lookup fast because we use cache
        geoIpInfo = this.geoIPService.lookup(ip)
      }

      return Masternode.fromObject({
        ...masternode,
        geoIpInfo
      })
    })

    return new PaginatedResultSet(
      resultSet,
      effectivePage,
      limit!=null ? effectiveLimit : Number(row?.total_count ?? rows.length),
      row?.total_count ?? 0
    );
  };

  getMasternodeStats = async (): Promise<MasternodeStats> => {
    const row = await this.knex('masternodes')
      .count('* as masternodes_total_count')
      .select(
        this.knex.raw(`count(*) filter (where type = ?) as regular_masternodes_count`, ['Regular']),
        this.knex.raw(`count(*) filter (where type = ?) as evo_masternodes_count`, ['Evo']),
        this.knex.raw(`count(*) filter (where type = ? and status = ?) as regular_enabled_masternodes`, ['Regular', 'ENABLED']),
        this.knex.raw(`count(*) filter (where type = ? and status = ?) as evo_enabled_masternodes`, ['Evo', 'ENABLED']),
      )
      .first<MasternodeStatsRow>()

    return MasternodeStats.fromRow(row)
  }
}