import {Knex} from 'knex';
import Redis from 'ioredis';
import {DashCoreRPC, GovernanceInfoRPC, GovernanceObjectSignal} from "../dashcoreRPC";
import {GovernanceObject} from "../models/GovernanceObject";
import {ProposalVote} from "../models/ProposalVote";
import SeriesData from "../models/SeriesData";
import MasternodesDAO from "./MasternodesDAO";
import {Cache} from "../cache";
import {PROTX_OUTPOINT_MAP_LIFE_TIME} from "../constants";

export default class GovernanceDAO {
  knex: Knex;
  redis: Redis;
  dashCoreRPC: DashCoreRPC;
  masternodesDAO: MasternodesDAO;
  cache: Cache;

  constructor(knex: Knex, redis: Redis, dashCoreRPC: DashCoreRPC, masternodesDAO: MasternodesDAO, cache: Cache) {
    this.knex = knex
    this.redis = redis
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

    if (list.length === 0) {
      throw new Error('protx list returned empty; not caching outpoint map')
    }

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
        const amount = proposal.paymentAmount ?? 0

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
          return compareStrings(a.name ?? '', b.name ?? '')
        case 'votes':
          return compareNumbers(
            (a.yesCount ?? 0) - (a.noCount ?? 0),
            (b.yesCount ?? 0) - (b.noCount ?? 0),
          )
        case 'payment_amount':
          return compareNumbers(a.paymentAmount ?? 0, b.paymentAmount ?? 0)
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

  getProposalVoteSeries = async (
    proposalHash: string,
    start: Date,
    end: Date,
    intervalInMs: number,
    runningTotal: boolean,
  ): Promise<SeriesData[]> => {
    const startMs = start.getTime();
    const endMs = end.getTime();
    const stepMs = intervalInMs;

    // Fixed-step buckets [from, to]; mirrors the previous
    // generate_series(start + step, end, step) with date_from = previous date_to.
    const buckets: { from: number; yes: number; no: number; abstain: number }[] = [];

    if (stepMs > 0) {
      for (let to = startMs + stepMs; to <= endMs; to += stepMs) {
        buckets.push({from: to - stepMs, yes: 0, no: 0, abstain: 0});
      }
    }

    const rawVotes = await this.redis.hvals(`dao:votes:${proposalHash}`);

    for (const raw of rawVotes) {
      const vote = ProposalVote.fromRaw(raw);

      // Only funding-signal votes feed the series, matching the old `signal LIKE 'funding%'`.
      if (vote == null || !vote.signal.startsWith('funding')) {
        continue;
      }

      // Bucket by vote_time > date_from AND <= date_to.
      const index = Math.ceil((vote.time.getTime() - startMs) / stepMs) - 1;

      if (index < 0 || index >= buckets.length) {
        continue;
      }

      const bucket = buckets[index];

      if (vote.outcome === 'yes') bucket.yes += 1;
      else if (vote.outcome === 'no') bucket.no += 1;
      else if (vote.outcome === 'abstain') bucket.abstain += 1;
    }

    let yesTotal = 0;
    let noTotal = 0;
    let abstainTotal = 0;

    return buckets.map(bucket => {
      if (runningTotal) {
        yesTotal += bucket.yes;
        noTotal += bucket.no;
        abstainTotal += bucket.abstain;

        return new SeriesData(new Date(bucket.from), {yes: yesTotal, no: noTotal, abstain: abstainTotal});
      }

      return new SeriesData(new Date(bucket.from), {yes: bucket.yes, no: bucket.no, abstain: bucket.abstain});
    });
  }

  getBudgetInfo = async (superblockHeight: number): Promise<number> => {
    return this.dashCoreRPC.getSuperblockBudget(superblockHeight)
  }

  getGovernanceInfo = async (): Promise<GovernanceInfoRPC> => {
    return this.dashCoreRPC.getGovernanceInfo()
  }
}