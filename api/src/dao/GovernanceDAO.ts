import {DashCoreRPC, GovernanceInfoRPC, GovernanceObjectSignal} from "../dashcoreRPC";
import {GovernanceObject} from "../models/GovernanceObject";
import {ProposalVote} from "../models/ProposalVote";
import MasternodesDAO from "./MasternodesDAO";
import {Cache} from "../cache";
import {PROTX_OUTPOINT_MAP_LIFE_TIME} from "../constants";

export default class GovernanceDAO {
  dashCoreRPC: DashCoreRPC;
  masternodesDAO: MasternodesDAO;
  cache: Cache;

  constructor(dashCoreRPC: DashCoreRPC, masternodesDAO: MasternodesDAO, cache: Cache) {
    this.dashCoreRPC = dashCoreRPC
    this.masternodesDAO = masternodesDAO
    this.cache = cache
  }

  private getProtxOutpointMap = async (): Promise<Record<string, string>> => {
    const cached = this.cache.get('protxOutpointMap')

    if (cached != null) {
      return cached
    }

    const list = await this.dashCoreRPC.getProTxList()

    const map: Record<string, string> = {}

    list.forEach(entry => {
      map[`${entry.collateralHash}-${entry.collateralIndex}`] = entry.proTxHash
    })

    this.cache.set('protxOutpointMap', map, PROTX_OUTPOINT_MAP_LIFE_TIME)

    return map
  }

  getProposals = async (
    proposalType?: GovernanceObjectSignal,
    orderBy?: string,
    order: string = 'asc',
  ): Promise<GovernanceObject[]> => {
    const [response, masternodeStats, governanceInfo] = await Promise.all([
      this.dashCoreRPC.getGovernanceObjects(proposalType, 'proposals'),
      this.masternodesDAO.getMasternodeStats(),
      this.dashCoreRPC.getGovernanceInfo(),
    ])

    const totalBudget = await this.dashCoreRPC.getSuperblockBudget(governanceInfo.nextsuperblock)

    const requiredProposalVotes = masternodeStats.requiredProposalVotes ?? 0

    const keys = Object.keys(response)

    const proposals = keys.map(key => {
      const proposal = GovernanceObject.fromObject({...response[key]})

      proposal.enoughVotes = (proposal.absoluteYesCount ?? 0) >= requiredProposalVotes
      proposal.enoughFunds = false

      return proposal
    });

    [...proposals]
      .sort((a, b) => (b.absoluteYesCount ?? 0) - (a.absoluteYesCount ?? 0))
      .reduce((running, proposal) => {
        const amount = proposal.data?.paymentAmount ?? 0

        if (running + amount > totalBudget) {
          return running
        }

        proposal.enoughFunds = true

        return running + amount
      }, 0)

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

  getMasternodeVotes = async (proTxHash: string): Promise<ProposalVote[]> => {
    const [outpointMap, objects] = await Promise.all([
      this.getProtxOutpointMap(),
      this.dashCoreRPC.getGovernanceObjects('all', 'proposals'),
    ])

    const targetOutpoint = Object.entries(outpointMap).find(([, hash]) => hash === proTxHash)?.[0]

    if (targetOutpoint == null) {
      return []
    }

    const proposalHashes = Object.values(objects).map(o => o.Hash)

    const perProposal = await Promise.all(
      proposalHashes.map(async proposalHash => {
        const rawVotes = await this.dashCoreRPC.getGovernanceObjectVotes(proposalHash)

        return Object.values(rawVotes)
          .map(value => ProposalVote.fromRaw(value))
          .filter((vote): vote is ProposalVote => vote != null)
          .filter(vote => vote.outpoint === targetOutpoint)
          .map(vote => {
            vote.proTxHash = proTxHash
            vote.proposalHash = proposalHash
            return vote
          })
      }),
    )

    return perProposal.flat()
  }

  getProposalByHash = async (hash: string): Promise<GovernanceObject | null> => {
    const [raw, masternodeStats, rawVotes, outpointMap] = await Promise.all([
      this.dashCoreRPC.getGovernanceObject(hash),
      this.masternodesDAO.getMasternodeStats(),
      this.dashCoreRPC.getGovernanceObjectVotes(hash),
      this.getProtxOutpointMap(),
    ])

    if (raw == null) {
      return null
    }

    const proposal = GovernanceObject.fromObject(raw)

    if (proposal.absoluteYesCount == null && proposal.fundingResult != null) {
      proposal.absoluteYesCount = proposal.fundingResult.absoluteYesCount
      proposal.yesCount = proposal.fundingResult.yesCount
      proposal.noCount = proposal.fundingResult.noCount
      proposal.abstainCount = proposal.fundingResult.abstainCount
    }

    const requiredProposalVotes = masternodeStats.requiredProposalVotes ?? 0

    proposal.enoughVotes = (proposal.absoluteYesCount ?? 0) >= requiredProposalVotes

    proposal.votes = Object.values(rawVotes)
      .map(value => ProposalVote.fromRaw(value))
      .filter((vote): vote is ProposalVote => vote != null)
      .map(vote => {
        vote.proTxHash = outpointMap[vote.outpoint] ?? null
        return vote
      })

    return proposal
  }

  getBudgetInfo = async (superblockHeight: number): Promise<number> => {
    return this.dashCoreRPC.getSuperblockBudget(superblockHeight)
  }

  getGovernanceInfo = async (): Promise<GovernanceInfoRPC> => {
    return this.dashCoreRPC.getGovernanceInfo()
  }
}