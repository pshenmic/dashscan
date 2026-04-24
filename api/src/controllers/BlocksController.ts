import { FastifyRequest, FastifyReply } from 'fastify';
import { Knex } from 'knex';
import BlocksDAO from '../dao/BlocksDAO';
import {PaginatedQuery} from "./types";
import {calculateInterval, iso8601duration} from "../utils";
import Intervals from "../enums/Intervals";

export default class BlocksController {
  private blocksDAO: BlocksDAO;

  constructor(knex: Knex) {
    this.blocksDAO = new BlocksDAO(knex);
  }

  getBlocks = async (request: FastifyRequest<{ Querystring: PaginatedQuery }>, response: FastifyReply): Promise<void> => {
    const { page = 1, limit = 10, order = 'asc', superblock } = request.query;

    const blocks = await this.blocksDAO.getBlocks(page, limit, order, superblock);

    response.send(blocks);
  };

  getTxCountStats = async (
    request: FastifyRequest<{
      Querystring: { timestamp_start: string; timestamp_end: string; intervals_count: number }
    }>,
    response: FastifyReply
  ): Promise<void> => {
    const {
      timestamp_start: start = new Date(new Date().getTime() - 3600000).toISOString(),
      timestamp_end: end = new Date().toISOString(),
      intervals_count: intervalsCount,
    } = request.query;

    if (new Date(start).getTime() > new Date(end).getTime()) {
      return response.status(400).send({ message: 'start timestamp cannot be more than end timestamp' });
    }

    const intervalInMs =
      Math.ceil(
        (new Date(end).getTime() - new Date(start).getTime()) / Number(intervalsCount ?? NaN) / 1000
      ) * 1000;

    const interval = intervalsCount
      ? iso8601duration(intervalInMs)
      : calculateInterval(new Date(start), new Date(end));

    const series = await this.blocksDAO.getTxCountStats(
      new Date(start),
      new Date(end),
      interval,
      isNaN(intervalInMs) ? Intervals[interval] : intervalInMs,
    );

    response.send(series);
  }

  getBlockByHash = async (request: FastifyRequest<{ Params: { hash: string } }>, response: FastifyReply): Promise<void> => {
    const { hash } = request.params;

    const block = await this.blocksDAO.getBlockByHash(hash);

    if (!block) {
      return response.status(404).send({ error: 'Block not found' });
    }

    response.send(block);
  };
}
