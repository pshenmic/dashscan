import {Knex} from 'knex';
import {DashCoreRPC, GovernanceObjectSignal} from "../dashcoreRPC";
import {FastifyReply, FastifyRequest} from "fastify";
import GovernanceDAO from "../dao/GovernanceDAO";
import BlocksDAO from "../dao/BlocksDAO";
import {GovernanceObject} from "../models/GovernanceObject";
import MasternodesDAO from "../dao/MasternodesDAO";
import GeoIPService from "../services/GeoIPService";
import {Cache} from "../cache";

export default class GovernanceController {
  governanceDAO: GovernanceDAO
  masternodesDAO: MasternodesDAO
  blocksDAO: BlocksDAO

  constructor(knex: Knex, dashCoreRPC: DashCoreRPC, geoIPService: GeoIPService, cache: Cache) {
    this.masternodesDAO = new MasternodesDAO(knex, geoIPService)
    this.governanceDAO = new GovernanceDAO(dashCoreRPC, this.masternodesDAO, cache)
    this.blocksDAO = new BlocksDAO(knex)
  }

  getMasternodeVotes = async (request: FastifyRequest<{ Params: { proTxHash: string } }>, response: FastifyReply): Promise<void> => {
    const {proTxHash} = request.params

    const votes = await this.governanceDAO.getMasternodeVotes(proTxHash)

    response.send(votes)
  }

  getProposalByHash = async (request: FastifyRequest<{ Params: { hash: string } }>, response: FastifyReply): Promise<void> => {
    const {hash} = request.params

    const proposal = await this.governanceDAO.getProposalByHash(hash)

    if (proposal == null) {
      return response.status(404).send({error: 'Proposal not found'})
    }

    response.send(proposal)
  }

  getProposals = async (request: FastifyRequest<{ Querystring: { proposalType?: GovernanceObjectSignal, order?: string, order_by?: string } }>, response: FastifyReply): Promise<void> => {
    const {proposalType, order = 'asc', order_by: orderBy} = request.query;

    const proposals = await this.governanceDAO.getProposals(proposalType, orderBy, order)

    response.send(proposals)
  }

  getBudgetInfo = async (_: FastifyRequest, response: FastifyReply): Promise<void> => {
    const {resultSet: superblocks} = await this.blocksDAO.getBlocks(1, 2, 'desc', true)
    const [lastSuperblock, prevSuperblock] = superblocks

    if (lastSuperblock?.timestamp == null || prevSuperblock?.timestamp == null) {
      response.code(404).send({error: 'Not enough superblocks indexed to compute next superblock time'})
      return
    }

    const [governanceInfo, allProposals, masternodeStats] = await Promise.all([
      this.governanceDAO.getGovernanceInfo(),
      this.governanceDAO.getProposals(),
      this.masternodesDAO.getMasternodeStats()
    ])

    if(governanceInfo.lastsuperblock>lastSuperblock.height) {
      response.status(500).send({error: 'Cannot find the last superblock in the database. Please wait if the sync progress is not at 100%.'})
    }

    const totalBudget = await this.governanceDAO.getBudgetInfo(governanceInfo.nextsuperblock)

    const cycleMs = lastSuperblock.timestamp.getTime() - prevSuperblock.timestamp.getTime()
    const nextSuperblockTimeMs = lastSuperblock.timestamp.getTime() + cycleMs
    const nextSuperblockTimeSec = Math.floor(nextSuperblockTimeMs / 1000)

    const avgBlockMs = cycleMs / governanceInfo.superblockcycle
    const votingDeadline = new Date(nextSuperblockTimeMs - governanceInfo.superblockmaturitywindow * avgBlockMs)

    const proposals = allProposals.filter(p =>
      p.objectType === 'Proposal' &&
      (p.endEpoch ?? 0) > nextSuperblockTimeSec
    )
    const voteThreshold = governanceInfo.governanceminquorum

    const totalRequested = proposals
      .reduce(
        (acc, curr) => acc + (curr.paymentAmount ?? 0),
        0
      )

    const enoughVotes = proposals
      .filter(p => (p.absoluteYesCount ?? 0) >= voteThreshold)
    const enoughVotesTotal = enoughVotes
      .reduce((acc, curr) => acc + (curr.paymentAmount ?? 0), 0)

    const rankedByVotes = [...enoughVotes].sort(
      (a, b) => b.absoluteYesCount - a.absoluteYesCount
    )

    let running = 0
    const enoughFunds = rankedByVotes.filter((p: GovernanceObject) => {
      const amount = p.paymentAmount ?? 0
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
      requiredVotes: masternodeStats.requiredProposalVotes,
      votingDeadline,
    })
  }
}