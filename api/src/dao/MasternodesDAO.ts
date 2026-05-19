import { Knex } from 'knex';
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

        if(ip!=null&&ip!='[::]:0'){
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

  getMasternodesMap = async (): Promise<Masternode[]> => {
    const rows = await this.knex('masternodes')
      .select(
        'pro_tx_hash', 'payee', 'status', 'type', 'created_at',
        'owner_address', 'voting_address', 'collateral_address', 'address'
      )

    return rows
      .filter((row)=>row.address!='[::]:0')
      .map(row => {
        const masternode = Masternode.fromRow(row)

        const [ip] = masternode.address.split(':')
        let geoIpInfo: GeoIpInfo | undefined = undefined

        if(ip!=null){
          geoIpInfo = this.geoIPService.lookup(ip)
        }

        return Masternode.fromObject({
          proTxHash: masternode.proTxHash,
          payee: masternode.payee,
          status: masternode.status,
          type: masternode.type,
          ownerAddress: masternode.ownerAddress,
          votingAddress: masternode.votingAddress,
          collateralAddress: masternode.collateralAddress,
          createdAt: masternode.createdAt,
          geoIpInfo
        })
      })
  }
}