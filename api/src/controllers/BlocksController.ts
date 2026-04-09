import { FastifyRequest, FastifyReply } from 'fastify';
import { Knex } from 'knex';
import BlocksDAO from '../dao/BlocksDAO';
import {PaginatedQuery} from "./types";

export default class BlocksController {
  private blocksDAO: BlocksDAO;

  constructor(knex: Knex) {
    this.blocksDAO = new BlocksDAO(knex);
  }

  getBlocks = async (request: FastifyRequest<{ Querystring: PaginatedQuery }>, response: FastifyReply): Promise<void> => {
    const { page = 1, limit = 10, order = 'asc' } = request.query;

    const blocks = await this.blocksDAO.getBlocks(page, limit, order);

    response.send(blocks);
  };

  getBlockByHash = async (request: FastifyRequest<{ Params: { hash: string } }>, response: FastifyReply): Promise<void> => {
    const { hash } = request.params;

    const block = await this.blocksDAO.getBlockByHash(hash);

    if (!block) {
      return response.status(404).send({ error: 'Block not found' });
    }

    response.send(block);
  };
}
