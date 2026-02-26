import { FastifyRequest, FastifyReply } from 'fastify';
import { Knex } from 'knex';
import TransactionsDAO from '../dao/TransactionsDAO';

export default class TransactionsController {
  private transactionsDAO: TransactionsDAO;

  constructor(knex: Knex) {
    this.transactionsDAO = new TransactionsDAO(knex);
  }

  getTransactions = async (request: FastifyRequest<{ Querystring: { page?: number; limit?: number; order?: string } }>, response: FastifyReply): Promise<void> => {
    const { page = 1, limit = 10, order = 'asc' } = request.query;

    const transactions = await this.transactionsDAO.getTransactions(page, limit, order);

    response.send(transactions);
  };

  getTransactionByHash = async (request: FastifyRequest<{ Params: { hash: string } }>, response: FastifyReply): Promise<void> => {
    const { hash } = request.params;

    const transaction = await this.transactionsDAO.getTransactionByHash(hash);

    if (!transaction) {
      return response.status(404).send('Transaction not found');
    }

    response.send(transaction);
  };

  getTransactionsByBlockHeight = async (request: FastifyRequest<{ Querystring: { page?: number; limit?: number; order?: string }; Params: { height?: number } }>, response: FastifyReply): Promise<void> => {
    const { page = 1, limit = 10, order = 'asc' } = request.query;
    const { height = 1 } = request.params;

    if (!height || height < 1) {
      return response.status(400).send('Invalid height');
    }

    const transactions = await this.transactionsDAO.getTransactionsByBlockHeight(height, page, limit, order);

    response.send(transactions);
  };
}
