import {DashCoreRPC, GovernanceInfoRPC, GovernanceObjectSignal} from "../dashcoreRPC";
import {GovernanceObject} from "../models/GovernanceObject";

export default class GovernanceDAO {
  dashCoreRPC: DashCoreRPC;

  constructor(dashCoreRPC: DashCoreRPC) {
    this.dashCoreRPC = dashCoreRPC
  }

  getProposals = async (
    proposalType?: GovernanceObjectSignal,
    orderBy?: string,
    order: string = 'asc',
  ): Promise<GovernanceObject[]> => {
    const response = await this.dashCoreRPC.getGovernanceObjects(proposalType, 'proposals')

    const keys = Object.keys(response)

    const proposals = keys.map(key => GovernanceObject.fromObject({
      ...response[key]
    }))

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