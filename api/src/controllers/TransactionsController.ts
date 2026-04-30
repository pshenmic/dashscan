import { FastifyRequest, FastifyReply } from 'fastify';
import { Knex } from 'knex';
import TransactionsDAO from '../dao/TransactionsDAO';
import {PaginatedQuery} from "./types";
import {calculateInterval, iso8601duration} from "../utils";
import Intervals from "../enums/Intervals";
import {TransactionType} from "../enums/TransactionType";

export default class TransactionsController {
  private transactionsDAO: TransactionsDAO;

  constructor(knex: Knex) {
    this.transactionsDAO = new TransactionsDAO(knex);
  }

  getTransactions = async (request: FastifyRequest<{ Querystring: PaginatedQuery }>, response: FastifyReply): Promise<void> => {
    const {
      page = 1, limit = 10, order = 'asc',
      coinjoin,
      transaction_type: transactionType,
      block_height: blockHeight } = request.query;

    const transactions = await this.transactionsDAO.getTransactions(page, limit, order, TransactionType[transactionType], coinjoin, blockHeight);

    response.send(transactions);
  };

  getTransactionByHash = async (request: FastifyRequest<{ Params: { hash: string } }>, response: FastifyReply): Promise<void> => {
    const { hash } = request.params;

    const transaction = await this.transactionsDAO.getTransactionByHash(hash);

    if (!transaction) {
      return response.status(404).send({error: 'Transaction not found'});
    }

    response.send(transaction);
  };

  getTransactionsByBlockHeight = async (request: FastifyRequest<{ Querystring: PaginatedQuery; Params: { height?: number } }>, response: FastifyReply): Promise<void> => {
    const { page = 1, limit = 10, order = 'asc' } = request.query;
    const { height = 1 } = request.params;

    if (!height || height < 1) {
      return response.status(400).send({error: 'Invalid height'});
    }

    const transactions = await this.transactionsDAO.getTransactionsByBlockHeight(height, page, limit, order);

    response.send(transactions);
  };

  getPendingTransactions = async (request: FastifyRequest<{ Querystring: PaginatedQuery }>, response: FastifyReply): Promise<void> => {
    const { page = 1, limit = 10, order = 'asc' } = request.query;
    
    const transactions = await this.transactionsDAO.getPendingTransactions(page, limit, order);

    response.send(transactions)
  }

  getTransactionCountSeries = async (
    request: FastifyRequest<{
      Querystring: { timestamp_start: string; timestamp_end: string; intervals_count: number; running_total: boolean }
    }>,
    response: FastifyReply
  ): Promise<void> => {
    const {
      timestamp_start: start = new Date(new Date().getTime() - 3600000).toISOString(),
      timestamp_end: end = new Date().toISOString(),
      intervals_count: intervalsCount,
      running_total: runningTotal = false,
    } = request.query;

    if (new Date(start).getTime() > new Date(end).getTime()) {
      return response.status(400).send({ error: 'start timestamp cannot be more than end timestamp' });
    }

    const intervalInMs =
      Math.ceil(
        (new Date(end).getTime() - new Date(start).getTime()) / Number(intervalsCount ?? NaN) / 1000
      ) * 1000;

    const interval = intervalsCount
      ? iso8601duration(intervalInMs)
      : calculateInterval(new Date(start), new Date(end));

    const series = await this.transactionsDAO.getTransactionCountSeries(
      new Date(start),
      new Date(end),
      interval,
      isNaN(intervalInMs) ? Intervals[interval] : intervalInMs,
      runningTotal,
    );

    response.send(series);
  }

  getTransactionStats = async (_: FastifyRequest, response: FastifyReply): Promise<void> => {
    const stats = await this.transactionsDAO.getTransactionStats24h();

    if(stats==null) {
      return response.status(500).send({error: "No indexed transactions"})
    }

    response.send(stats);
  }

  getAddressTransactions = async (request: FastifyRequest<{ Params: {address: string}, Querystring: PaginatedQuery }>, response: FastifyReply): Promise<void> => {
    const { page = 1, limit = 10, order = 'asc' } = request.query;
    const { address } = request.params;

    const transactions = await this.transactionsDAO.getAddressTransactions(address, page, limit, order);

    response.send(transactions)
  }
}
