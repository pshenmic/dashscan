import { Knex } from 'knex';
import Masternode from '../models/Masternode';
import PaginatedResultSet from '../models/PaginatedResultSet';
import GeoIPService, {IpInfo} from "../services/GeoIPService";

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
        let ipInfo: IpInfo | undefined = undefined

        if(ip!=null){
          ipInfo = this.geoIPService.lookup(ip)
        }

        return Masternode.fromObject({
          ...masternode,
          ipInfo
        })
      }),
      page,
      limit,
      row?.total_count
    );
  };
}