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
    const [chainInfoResponse, stats] = await Promise.all([
      this.dashcoreRPC.getChainInfo(),
      this.blocksDAO.getChainStats(120, 20),
    ]);

    const chainStats = ChainStats.fromRpcResponse(chainInfoResponse);

    const lastTs = new Date(stats.last_timestamp).getTime();
    const firstTs = new Date(stats.first_timestamp).getTime();
    const btFirstTs = new Date(stats.bt_first_timestamp).getTime();

    const btTimeSpanMSec = lastTs - btFirstTs;
    const btTimeSpanSec = btTimeSpanMSec / 1000;
    const btSampleSize = Number(stats.bt_sample_size);

    const blockTime = btSampleSize > 1
      ? Math.floor(btTimeSpanMSec / (btSampleSize - 1))
      : null;

    const transactionsCount = Number(stats.bt_tx_count);
    const transactionsPerSecond = btTimeSpanSec > 0
      ? Number((transactionsCount / btTimeSpanSec).toFixed(2))
      : null;
    const transactionsPerMinute = btTimeSpanSec > 0
      ? Number((transactionsCount / (btTimeSpanSec / 60)).toFixed(2))
      : null;

    // TODO: Indexer contain chainwork field which at this moment empty (P2P doesn't return)
    const hrTimeSpanMs = BigInt(lastTs - firstTs);
    const difficultySum = Number(stats.work_sum);
    // can be more than safe number range
    const hashRate = hrTimeSpanMs > 0n && difficultySum > 0
      ? ((BigInt(Math.floor(difficultySum)) * (1n << 32n) * 1000n) / hrTimeSpanMs).toString()
      : null;

    response.send(ChainStats.fromObject({
      ...chainStats,
      blockTime: blockTime ?? undefined,
      transactionsPerSecond: transactionsPerSecond ?? undefined,
      transactionsPerMinute: transactionsPerMinute ?? undefined,
      latestHeight: Number(stats.latest_height),
      hashRate: hashRate ?? undefined,
      mempoolSize: Number(stats.mempool_size),
    }));
  }
}
