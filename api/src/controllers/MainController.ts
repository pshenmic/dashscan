import { FastifyRequest, FastifyReply } from 'fastify';
import { Knex } from 'knex';
import { DashCoreRPC } from '../dashcoreRPC';
import BlocksDAO from '../dao/BlocksDAO';
import ChainInfo from "../models/ChainInfo";

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

  getChainInfo = async (_: FastifyRequest, response: FastifyReply): Promise<void> => {
    const chainInfo = await this.dashcoreRPC.getChainInfo();

    response.send(ChainInfo.fromRpcResponse(chainInfo))
  }
}
