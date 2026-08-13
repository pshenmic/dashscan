import {FastifyReply, FastifyRequest} from 'fastify';
import {Knex} from 'knex';
import AddressesDAO from '../dao/AddressesDAO';
import TransactionsDAO from '../dao/TransactionsDAO';
import XpubService from '../services/XpubService';
import PaginatedResultSet from '../models/PaginatedResultSet';
import XpubAddress from '../models/XpubAddress';
import XpubSummary from '../models/XpubSummary';
import {Cache} from '../cache';
import {XpubBody} from './types';
import {XPUB_DEFAULT_GAP_LIMIT} from '../constants';

export default class XpubController {
  private addressesDAO: AddressesDAO;
  private transactionsDAO: TransactionsDAO;
  private xpubService: XpubService;

  constructor(knex: Knex, cache: Cache) {
    this.addressesDAO = new AddressesDAO(knex);
    this.transactionsDAO = new TransactionsDAO(knex);
    this.xpubService = new XpubService(this.addressesDAO, cache);
  }

  getXpub = async (request: FastifyRequest<{ Body: XpubBody }>, response: FastifyReply): Promise<void> => {
    const {xpub, gap_limit: gapLimit = XPUB_DEFAULT_GAP_LIMIT} = request.body;

    const resolved = await this.xpubService.resolve(xpub, gapLimit);

    const summary = await this.addressesDAO.getXpubSummary(resolved.addressIds);

    response.send(XpubSummary.fromObject({
      ...summary,
      addressCount: resolved.addresses.length,
      usedAddressCount: resolved.addressIds.length,
      nextUnused: {
        receive: resolved.nextUnused[0] ?? null,
        change: resolved.nextUnused[1] ?? null,
      },
    }));
  };

  getXpubAddresses = async (request: FastifyRequest<{ Body: XpubBody }>, response: FastifyReply): Promise<void> => {
    const {xpub, gap_limit: gapLimit = XPUB_DEFAULT_GAP_LIMIT, page = 1, limit = 100} = request.body;

    const resolved = await this.xpubService.resolve(xpub, gapLimit);

    const from = (page - 1) * limit;

    const addresses = XpubAddress.fromObjects(resolved.addresses.slice(from, from + limit));

    response.send(new PaginatedResultSet(addresses, page, limit, resolved.addresses.length));
  };

  getXpubUtxo = async (request: FastifyRequest<{ Body: XpubBody }>, response: FastifyReply): Promise<void> => {
    const {xpub, gap_limit: gapLimit = XPUB_DEFAULT_GAP_LIMIT, page = 1, limit = 100} = request.body;

    const resolved = await this.xpubService.resolve(xpub, gapLimit);

    const utxo = await this.addressesDAO.getXpubUtxo(resolved.addressIds, page, limit);

    response.send(utxo);
  };

  getXpubTransactions = async (request: FastifyRequest<{ Body: XpubBody }>, response: FastifyReply): Promise<void> => {
    const {xpub, gap_limit: gapLimit = XPUB_DEFAULT_GAP_LIMIT, limit = 25, cursor} = request.body;

    const resolved = await this.xpubService.resolve(xpub, gapLimit);

    const transactions = await this.transactionsDAO.getXpubTransactions(resolved.addressIds, limit, cursor);

    response.send(transactions);
  };
}
