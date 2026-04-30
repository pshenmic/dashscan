import { FastifyRequest, FastifyReply } from 'fastify';
import { Knex } from 'knex';
import { DashCoreRPC } from '../dashcoreRPC';
import BlocksDAO from '../dao/BlocksDAO';
import ChainStats from "../models/ChainStats";

export default class MainController {
  private dashcoreRPC: DashCoreRPC;
  private blocksDAO: BlocksDAO;

  constructor(dashcoreRPC: DashCoreRPC, knex: Knex) {
    this.dashcoreRPC = dashcoreRPC;
    this.blocksDAO = new BlocksDAO(knex);
  }

  getStatus = async (_: FastifyRequest, response: FastifyReply): Promise<void> => {
    try {
      const networkHeight = await this.dashcoreRPC.getBlockCount();
      const {resultSet: [block]} = await this.blocksDAO.getBlocks(1, 1, 'desc');

      if (block == null || block.height < networkHeight) {
        return response.status(503).send({ status: 'syncing' });
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

    response.send(ChainStats.fromObject({
      ...dbStats,
      chain: chainInfoResponse.chain,
      sizeOnDisk: chainInfoResponse.size_on_disk,
      difficulty: chainInfoResponse.difficulty,
    }));
  }
}
