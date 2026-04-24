import {Knex} from 'knex';
import {DashCoreRPC, GovernanceObjectSignal} from "../dashcoreRPC";
import {FastifyReply, FastifyRequest} from "fastify";
import GovernanceDAO from "../dao/GovernanceDAO";
import BlocksDAO from "../dao/BlocksDAO";
import {GovernanceObject} from "../models/GovernanceObject";

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

  getBudgetInfo = async (_: FastifyRequest, response: FastifyReply): Promise<void> => {

    const {resultSet: superblocks} = await this.blocksDAO.getBlocks(1, 2, 'desc', true)
    const [lastSuperblock, prevSuperblock] = superblocks

    if (lastSuperblock?.timestamp == null || prevSuperblock?.timestamp == null) {
      response.code(404).send({error: 'Not enough superblocks indexed to compute next superblock time'})
      return
    }

    const [governanceInfo, allProposals] = await Promise.all([
      this.governanceDAO.getGovernanceInfo(),
      this.governanceDAO.getProposals(),
    ])

    if(governanceInfo.lastsuperblock>lastSuperblock.height) {
      response.status(500).send({error: 'Cannot find the last superblock in the database. Please wait if the sync progress is not at 100%.'})
    }

    const totalBudget = await this.governanceDAO.getBudgetInfo(governanceInfo.nextsuperblock)

    const cycleMs = lastSuperblock.timestamp.getTime() - prevSuperblock.timestamp.getTime()
    const nextSuperblockTimeSec = Math.floor((lastSuperblock.timestamp.getTime() + cycleMs) / 1000)

    const proposals = allProposals.filter(p =>
      p.objectType === 'Proposal' &&
      (p.data?.endEpoch ?? 0) > nextSuperblockTimeSec
    )
    const voteThreshold = governanceInfo.governanceminquorum

    const totalRequested = proposals
      .reduce(
        (acc, curr) => acc + (curr.data?.paymentAmount ?? 0),
        0
      )

    const enoughVotes = proposals
      .filter(p => (p.absoluteYesCount ?? 0) >= voteThreshold)
    const enoughVotesTotal = enoughVotes
      .reduce((acc, curr) => acc + (curr.data?.paymentAmount ?? 0), 0)

    const rankedByVotes = [...enoughVotes].sort(
      (a, b) => b.absoluteYesCount - a.absoluteYesCount
    )

    let running = 0
    const enoughFunds = rankedByVotes.filter((p: GovernanceObject) => {
      const amount = p.data?.paymentAmount ?? 0
      if (running + amount <= totalBudget) {
        running += amount
        return true
      }
      return false
    })

    response.send({
      totalBudget,
      totalProposals: proposals.length,
      totalRequested,
      enoughVotesTotal,
      enoughVotesCount: enoughVotes.length,
      enoughFundsTotal: running,
      enoughFundsCount: enoughFunds.length,
      remainingAllPass: totalBudget - totalRequested,
      remainingEnoughVotes: totalBudget - enoughVotesTotal,
    })
  }
}