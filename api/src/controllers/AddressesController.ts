import {FastifyReply, FastifyRequest} from 'fastify';
import {Knex} from 'knex';
import AddressesDAO from '../dao/AddressesDAO';
import {PaginatedQuery} from "./types";
import {calculateInterval, iso8601duration} from "../utils";
import Intervals from "../enums/Intervals";
import {Cache} from "../cache";
import {DashCoreRPC} from "../dashcoreRPC";
import AddressBalance from "../models/AddressBalance";
import {CONCENTRATION_DECIMALS, UTXO_INFO_LIFE_TIME} from "../constants";

export default class AddressesController {
  private addressesDAO: AddressesDAO;
  private cache: Cache;
  private dashcoreRPC: DashCoreRPC;

  constructor(knex: Knex, dashcoreRPC: DashCoreRPC, cache: Cache) {
    this.addressesDAO = new AddressesDAO(knex);
    this.dashcoreRPC = dashcoreRPC;
    this.cache = cache;
  }

  getAddresses = async (request: FastifyRequest<{
    Querystring: PaginatedQuery
  }>, response: FastifyReply): Promise<void> => {
    const {page = 1, limit = 10, order = 'asc'} = request.query;

    const addresses = await this.addressesDAO.getAddresses(page, limit, order);

    response.send(addresses);
  };

  getAddress = async (request: FastifyRequest<{
    Params: { address: string }
  }>, response: FastifyReply): Promise<void> => {
    const {address} = request.params;

    const result = await this.addressesDAO.getAddress(address);

    if (!result) {
      response.status(404).send({error: 'Address not found'});
      return;
    }

    response.send(result);
  }

  getAddressBalanceSeries = async (
    request: FastifyRequest<{
      Params: { address: string };
      Querystring: { timestamp_start: string; timestamp_end: string; timespan: string; intervals_count: number }
    }>,
    response: FastifyReply
  ): Promise<void> => {
    const {address} = request.params;
    const {
      timestamp_start: start = new Date().getTime() - 3600000,
      timestamp_end: end = new Date().getTime(),
      intervals_count: intervalsCount
    } = request.query;

    if (!start || !end) {
      return response.status(400).send({message: 'start and end must be set'})
    }

    if (new Date(start).getTime() > new Date(end).getTime()) {
      return response.status(400).send({message: 'start timestamp cannot be more than end timestamp'})
    }

    const intervalInMs =
      Math.ceil(
        (new Date(end).getTime() - new Date(start).getTime()) / Number(intervalsCount ?? NaN) / 1000
      ) * 1000

    const interval = intervalsCount
      ? iso8601duration(intervalInMs)
      : calculateInterval(new Date(start), new Date(end))

    const series = await this.addressesDAO.getAddressBalanceSeries(address, new Date(start), new Date(end), interval, isNaN(intervalInMs) ? Intervals[interval] : intervalInMs);

    response.send(series);
  }

  getAddressUtxo = async (request: FastifyRequest<{
    Querystring: PaginatedQuery,
    Params: { address: string }
  }>, response: FastifyReply): Promise<void> => {
    const {page = 1, limit = 10, order = 'asc'} = request.query;
    const {address} = request.params;

    const utxo = await this.addressesDAO.getAddressUtxo(address, page, limit, order);

    response.send(utxo)
  }

  getBalancesInfo = async (request: FastifyRequest<{
    Querystring: PaginatedQuery
  }>, response: FastifyReply): Promise<void> => {
    const {page = 1, limit = 10, order = 'asc'} = request.query;

    let utxoInfo = this.cache.get('utxoInfo');

    if (utxoInfo==null) {
      utxoInfo = await this.dashcoreRPC.getUtxoInfo();
      this.cache.set('utxoInfo', utxoInfo, UTXO_INFO_LIFE_TIME)
    }

    const {total_amount: totalSupply} = utxoInfo

    // use limit-1 for "other" addresses
    const balances = await this.addressesDAO.getBalancesInfo(page, limit-1, order);

    // rpc returns supply in dash, but in db we store in duffs.
    // divide duffs balance by 10^8 to get balance in dash
    balances.resultSet = balances.resultSet.map(balance => {
      const concentration = ((Number(balance.balance) / 1e8) / totalSupply * 100)
      return AddressBalance.fromObject({
        ...balance,
        concentration: concentration.toFixed(CONCENTRATION_DECIMALS)
      })
    })

    const shownDuffs = balances.resultSet.reduce((acc, b) => acc + BigInt(b.balance ?? 0), 0n)
    const totalDuffs = BigInt(Math.round(totalSupply * 1e8))
    const othersDuffs = totalDuffs - shownDuffs

    const othersConcentration = (Number(othersDuffs) / 1e8) / totalSupply * 100

    balances.resultSet.push(AddressBalance.fromObject({
      address: 'others',
      balance: othersDuffs.toString(),
      concentration: othersConcentration.toFixed(CONCENTRATION_DECIMALS),
    }))

    balances.pagination.limit = limit

    response.send(balances)
  }
}
