import {DashCoreRPC, GovernanceInfoRPC, GovernanceObjectSignal} from "../dashcoreRPC";
import {GovernanceObject} from "../models/GovernanceObject";
import MasternodesDAO from "./MasternodesDAO";

export default class GovernanceDAO {
  dashCoreRPC: DashCoreRPC;
  masternodesDAO: MasternodesDAO;

  constructor(dashCoreRPC: DashCoreRPC, masternodesDAO: MasternodesDAO) {
    this.dashCoreRPC = dashCoreRPC
    this.masternodesDAO = masternodesDAO
  }

  getProposals = async (
    proposalType?: GovernanceObjectSignal,
    orderBy?: string,
    order: string = 'asc',
  ): Promise<GovernanceObject[]> => {
    const [response, masternodeStats] = await Promise.all([
      this.dashCoreRPC.getGovernanceObjects(proposalType, 'proposals'),
      this.masternodesDAO.getMasternodeStats(),
    ])

    const threshold = masternodeStats.requiredProposalVotes ?? 0

    const keys = Object.keys(response)

    const proposals = keys.map(key => {
      const proposal = GovernanceObject.fromObject({...response[key]})

      proposal.enoughVotes = (proposal.absoluteYesCount ?? 0) >= threshold

      return proposal
    })

    if (orderBy == null) {
      return proposals
    }

    const direction = order === 'desc' ? -1 : 1

    const compareNumbers = (a: number, b: number): number => (a - b) * direction
    const compareStrings = (a: string, b: string): number => a.localeCompare(b) * direction

    return proposals.sort((a, b) => {
      switch (orderBy) {
        case 'creation_time':
          return compareNumbers(a.creationTime?.getTime() ?? 0, b.creationTime?.getTime() ?? 0)
        case 'name':
          return compareStrings(a.data?.name ?? '', b.data?.name ?? '')
        case 'votes':
          return compareNumbers(
            (a.yesCount ?? 0) - (a.noCount ?? 0),
            (b.yesCount ?? 0) - (b.noCount ?? 0),
          )
        case 'payment_amount':
          return compareNumbers(a.data?.paymentAmount ?? 0, b.data?.paymentAmount ?? 0)
        default:
          return 0
      }
    })
  }

  getBudgetInfo = async (superblockHeight: number): Promise<number> => {
    return this.dashCoreRPC.getSuperblockBudget(superblockHeight)
  }

  getGovernanceInfo = async (): Promise<GovernanceInfoRPC> => {
    return this.dashCoreRPC.getGovernanceInfo()
  }
}