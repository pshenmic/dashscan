import {Knex} from 'knex';
import {DashCoreRPC, GovernanceInfoRPC, GovernanceObjectSignal} from "../dashcoreRPC";
import {GovernanceObject} from "../models/GovernanceObject";
import {ProposalVote} from "../models/ProposalVote";
import SeriesData from "../models/SeriesData";
import MasternodesDAO from "./MasternodesDAO";
import {Cache} from "../cache";
import {PROTX_OUTPOINT_MAP_LIFE_TIME} from "../constants";

export default class GovernanceDAO {
  knex: Knex;
  dashCoreRPC: DashCoreRPC;
  masternodesDAO: MasternodesDAO;
  cache: Cache;

  constructor(knex: Knex, dashCoreRPC: DashCoreRPC, masternodesDAO: MasternodesDAO, cache: Cache) {
    this.knex = knex
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

  getProposalVoteSeries = async (
    proposalHash: string,
    start: Date,
    end: Date,
    interval: string,
    intervalInMs: number,
    runningTotal: boolean,
  ): Promise<SeriesData[]> => {
    const startSql = `'${new Date(start.getTime() + intervalInMs).toISOString()}'::timestamptz`;
    const endSql = `'${new Date(end.getTime()).toISOString()}'::timestamptz`;

    const proposalIdSubquery = this.knex('proposals')
      .select('id')
      .where('hash', proposalHash);

    const ranges = this.knex
      .from(this.knex.raw(`generate_series(${startSql}, ${endSql}, '${interval}'::interval) date_to`))
      .select('date_to')
      .select(
        this.knex.raw(
          'LAG(date_to, 1, ?::timestamptz) OVER (ORDER BY date_to ASC) AS date_from',
          [start.toISOString()]
        )
      );

    const votesCTE = this.knex('proposal_votes')
      .select('vote_time', 'outcome')
      .whereIn('proposal_id', proposalIdSubquery)
      .whereLike('signal', 'funding%');

    const bucketsCTE = this.knex('ranges')
      .select('date_from')
      .select(this.knex.raw(`COUNT(*) FILTER (WHERE votes.outcome = 'yes')::bigint AS yes`))
      .select(this.knex.raw(`COUNT(*) FILTER (WHERE votes.outcome = 'no')::bigint AS no`))
      .select(this.knex.raw(`COUNT(*) FILTER (WHERE votes.outcome = 'abstain')::bigint AS abstain`))
      .leftJoin('votes', function () {
        this.on('votes.vote_time', '>', 'ranges.date_from')
          .andOn('votes.vote_time', '<=', 'ranges.date_to');
      })
      .groupBy('date_from');

    const valueSelect = (column: string): Knex.Raw => runningTotal
      ? this.knex.raw(`SUM(${column}) OVER (ORDER BY date_from ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS ${column}`)
      : this.knex.raw(`${column}`);

    const rows = await this.knex
      .with('ranges', ranges)
      .with('votes', votesCTE)
      .with('buckets', bucketsCTE)
      .select('date_from')
      .select(valueSelect('yes'))
      .select(valueSelect('no'))
      .select(valueSelect('abstain'))
      .from('buckets')
      .orderBy('date_from', 'asc');

    return rows.map((row: any) => new SeriesData(
      new Date(row.date_from),
      {
        yes: Number(row.yes),
        no: Number(row.no),
        abstain: Number(row.abstain),
      },
    ));
  }

  getBudgetInfo = async (superblockHeight: number): Promise<number> => {
    return this.dashCoreRPC.getSuperblockBudget(superblockHeight)
  }

  getGovernanceInfo = async (): Promise<GovernanceInfoRPC> => {
    return this.dashCoreRPC.getGovernanceInfo()
  }
}