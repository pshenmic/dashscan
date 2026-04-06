import {DashCoreRPC, GovernanceObjectSignal} from "../dashcoreRPC";
import {FastifyReply, FastifyRequest} from "fastify";
import GovernanceDAO from "../dao/GovernanceDAO";

export default class GovernanceController {
  governanceDAO: GovernanceDAO

  constructor(dashCoreRPC: DashCoreRPC) {
    this.governanceDAO = new GovernanceDAO(dashCoreRPC)
  }

  getProposals = async (request: FastifyRequest<{ Querystring: { proposalType?: GovernanceObjectSignal } }>, response: FastifyReply): Promise<void> => {
    const {proposalType} = request.query;

    const proposals = await this.governanceDAO.getProposals(proposalType)

    response.send(proposals)
  }
}