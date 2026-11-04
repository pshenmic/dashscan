import { FastifyRequest, FastifyReply } from 'fastify';
import { Knex } from 'knex';
import BlocksDAO from '../dao/BlocksDAO';
import {PaginatedQuery} from "./types";
import {calculateInterval, iso8601duration} from "../utils";
import Intervals from "../enums/Intervals";
import {DashCoreRPC} from "../dashcoreRPC";
import BlockReward from "../models/BlockReward";

export default class BlocksController {
  private blocksDAO: BlocksDAO;
  private dashcoreRPC: DashCoreRPC;

  constructor(knex: Knex, dashcoreRPC: DashCoreRPC) {
    this.blocksDAO = new BlocksDAO(knex);
    this.dashcoreRPC = dashcoreRPC;
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

  getBlockReward = async (request: FastifyRequest<{ Params: { height: number } }>, response: FastifyReply): Promise<void> => {
    const { height } = request.params;

    const coinbaseTotal = await this.blocksDAO.getCoinbaseTotal(height);

    if (coinbaseTotal == null) {
      return response.status(404).send({ error: 'Block not found' });
    }

    const [stats, payments] = await Promise.all([
      this.dashcoreRPC.getBlockStats(height),
      this.dashcoreRPC.getBlockHash(height).then((hash) => this.dashcoreRPC.getMasternodePayments(hash)),
    ]);

    response.send(BlockReward.fromRPC(stats, payments.find((p) => p.height === height), coinbaseTotal));
  };
}
