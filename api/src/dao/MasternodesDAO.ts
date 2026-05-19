import { Knex } from 'knex';
import Masternode from '../models/Masternode';
import PaginatedResultSet from '../models/PaginatedResultSet';
import GeoIPService, {GeoIpInfo} from "../services/GeoIPService";
import MasternodeStats from "../models/MasternodeStats";

export default class MasternodesDAO {
  private knex: Knex;
  private geoIPService: GeoIPService;

  constructor(knex: Knex, geoIPService: GeoIPService) {
    this.knex = knex;
    this.geoIPService = geoIPService;
  }

  getMasternodes = async (page: number, limit: number, order: string): Promise<PaginatedResultSet<Masternode>> => {
    const fromRank = (page - 1) * limit;

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
      .select(this.knex('masternodes').count('pro_tx_hash').as('total_count'))
      .orderBy('last_paid_block', order)
      .limit(limit)
      .offset(fromRank);

    const [row] = rows;

    return new PaginatedResultSet(
      rows.map(row => {
        const masternode = Masternode.fromRow(row)

        const [ip] = masternode.address.split(':')
        let geoIpInfo: GeoIpInfo | undefined = undefined

        if(ip!=null){
          geoIpInfo = this.geoIPService.lookup(ip)
        }

        return Masternode.fromObject({
          ...masternode,
          geoIpInfo
        })
      }),
      page,
      limit,
      row?.total_count
    );
  };

  getMasternodesStats = async (): Promise<MasternodeStats> => {
    const evoSubquery = this.knex('masternodes')
      .where('type', 'Evo')

    const regularSubquery = this.knex('masternodes')
      .where('type', 'Regular')

    const row = await this.knex
      .with('evo_masternodes', evoSubquery)
      .with('regular_masternodes', regularSubquery)
      .select(
        this.knex('masternodes')
          .count('*')
          .as('masternodes_total_count')
      )
      .select(
        this.knex('regular_masternodes')
          .count('*')
          .limit(1)
          .as('regular_masternodes_count'),
        this.knex('evo_masternodes')
          .count('*')
          .limit(1)
          .as('evo_masternodes_count')
      )
      .select(
        this.knex('regular_masternodes')
          .where('status', 'ENABLED')
          .count('*')
          .limit(1)
          .as('regular_enabled_masternodes'),
        this.knex('evo_masternodes')
          .where('status', 'ENABLED')
          .count('*')
          .limit(1)
          .as('evo_enabled_masternodes')
      )
      .first()

    return MasternodeStats.fromRow(row)
  }
}