import {Knex} from 'knex';
import {DashCoreRPC, GovernanceObjectSignal} from "../dashcoreRPC";
import {FastifyReply, FastifyRequest} from "fastify";
import GovernanceDAO from "../dao/GovernanceDAO";
import BlocksDAO from "../dao/BlocksDAO";

export default class GovernanceController {
  governanceDAO: GovernanceDAO
  blocksDAO: BlocksDAO

  constructor(dashCoreRPC: DashCoreRPC, knex: Knex) {
    this.governanceDAO = new GovernanceDAO(dashCoreRPC)
    this.blocksDAO = new BlocksDAO(knex)
  }

  getProposals = async (request: FastifyRequest<{ Querystring: { proposalType?: GovernanceObjectSignal } }>, response: FastifyReply): Promise<void> => {
    const {proposalType} = request.query;

    const proposals = await this.governanceDAO.getProposals(proposalType)

    response.send(proposals)
  }

  getPeriodBudget = async (request: FastifyRequest<{ Querystring: { superblockHeight?: number } }>, response: FastifyReply): Promise<void> => {
    let {superblockHeight} = request.query;

    if (superblockHeight == null) {
      const {resultSet: [lastSuperblock]} = await this.blocksDAO.getBlocks(1,1,'desc', true)

      if (lastSuperblock?.height == null) {
        response.code(404).send({error: 'No superblock found. Please try to set superblockHeight.'})
        return
      }

      superblockHeight = lastSuperblock.height
    }

    const budget = await this.governanceDAO.getPeriodBudget(superblockHeight);

    response.send({budget})
  }
}