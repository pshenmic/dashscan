import { FastifyRequest, FastifyReply } from 'fastify';
import { Knex } from 'knex';
import { DashCoreRPC } from '../dashcoreRPC';
import BlocksDAO from '../dao/BlocksDAO';
import ChainStats from "../models/ChainStats";
import Deployment from "../models/Deployment";
import {calculateInterval, getUtxoInfo, iso8601duration} from "../utils";
import Intervals from "../enums/Intervals";
import {Cache} from "../cache";

export default class MainController {
  private dashcoreRPC: DashCoreRPC;
  private blocksDAO: BlocksDAO;
  private cache: Cache;

  constructor(dashcoreRPC: DashCoreRPC, cache: Cache, knex: Knex) {
    this.dashcoreRPC = dashcoreRPC;
    this.blocksDAO = new BlocksDAO(knex);
    this.cache = cache;
  }

  getStatus = async (_: FastifyRequest, response: FastifyReply): Promise<void> => {
    try {
      const networkHeight = await this.dashcoreRPC.getBlockCount();
      const {resultSet: [block]} = await this.blocksDAO.getBlocks(1, 1, 'desc');

      // if block height difference between db and network more than 1 block
      if (block == null || (networkHeight - block.height > Number(process.env.STATUS_CHECK_HEIGHT_GAP ?? 1))) {
        return response.status(503).send({status: 'syncing'});
      }

      return response.status(200).send({ status: 'ok' });
    } catch (e) {
      console.error(e);
      return response.status(500).send({ status: 'internal server error' });
    }
  };

  getChainStats = async (_: FastifyRequest, response: FastifyReply): Promise<void> => {
    const [chainInfoResponse, dbStats] = await Promise.all([
      this.dashcoreRPC.getChainInfo(),
      this.blocksDAO.getChainStats(120, 20),
    ]);

    const blockStats = await this.dashcoreRPC.getBlockStats(chainInfoResponse.blocks);

    return response.send(ChainStats.fromObject({
      ...dbStats,
      chain: chainInfoResponse.chain,
      sizeOnDisk: chainInfoResponse.size_on_disk,
      difficulty: chainInfoResponse.difficulty,
      blockSubsidy: blockStats.subsidy,
      blockFees: blockStats.totalfee,
    }));
  }

  getChainStatsSeries = async (
    request: FastifyRequest<{
      Querystring: { timestamp_start: string; timestamp_end: string; intervals_count: number }
    }>,
    response: FastifyReply
  ): Promise<void> => {
    const {
      timestamp_start: start = new Date(new Date().getTime() - 30 * 86400000).toISOString(),
      timestamp_end: end = new Date().toISOString(),
      intervals_count: intervalsCount,
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

    const series = await this.blocksDAO.getChainStatsSeries(
      new Date(start),
      new Date(end),
      interval,
      isNaN(intervalInMs) ? Intervals[interval] : intervalInMs,
    );

    return response.send(series);
  }

  getDeployments = async (_: FastifyRequest, response: FastifyReply): Promise<void> => {
    const {hash, height, deployments} = await this.dashcoreRPC.getDeploymentInfo();

    return response.send({
      hash,
      height,
      deployments: Object.entries(deployments).map(([id, deployment]) => Deployment.fromRPC(id, deployment)),
    });
  };

  getTotalSupply = async (_: FastifyRequest, response: FastifyReply): Promise<void> => {
    const {total_amount} = await getUtxoInfo(this.dashcoreRPC, this.cache);

    // all other endpoints returns value in duffs, while total_amount in DASH's
    return response.send({totalSupply: BigInt(Math.round(total_amount * 1e8)).toString()});
  };
}
