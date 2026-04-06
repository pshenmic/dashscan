import {DashCoreRPC, GovernanceObjectSignal} from "../dashcoreRPC";
import {GovernanceObject} from "../models/GovernanceObject";

export default class GovernanceDAO {
  dashCoreRPC: DashCoreRPC;

  constructor(dashCoreRPC: DashCoreRPC) {
    this.dashCoreRPC = dashCoreRPC
  }

  getProposals = async (proposalType: GovernanceObjectSignal): Promise<GovernanceObject[]> => {
    const response = await this.dashCoreRPC.getGovernanceObjects(proposalType)

    const keys = Object.keys(response)

    const proposals: GovernanceObject[] = keys.map(key => GovernanceObject.fromObject({
      ...response[key]
    }))

    return proposals
  }
}