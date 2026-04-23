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
    const chainInfoResponse = await this.dashcoreRPC.getChainInfo();
    const chainInfo = ChainInfo.fromRpcResponse(chainInfoResponse)

    const {resultSet} = await this.blocksDAO.getBlocks(1, 20, 'desc');

    const [lastBlock] = resultSet;
    const [firstBlock] = resultSet.reverse();

    const timeSpanMSec = lastBlock.timestamp.getTime() - firstBlock.timestamp.getTime();
    const timeSpanSec = timeSpanMSec / 1000;

    const blockTime = Math.floor((timeSpanMSec / (resultSet.length - 1)));

    const transactionsCount = resultSet.reduce((acc, curr) => acc+curr.txCount, 0)
    const transactionsPerSecond = Number((transactionsCount / timeSpanSec).toFixed(2))
    const transactionsPerMinute = Number((transactionsCount / (timeSpanSec / 60)).toFixed(2))

    response.send(ChainInfo.fromObject({
      ...chainInfo,
      blockTime,
      transactionsPerSecond,
      transactionsPerMinute,
      latestHeight: lastBlock.height
    }))
  }
}
