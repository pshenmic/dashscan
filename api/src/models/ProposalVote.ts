export type VoteOutcome = 'yes' | 'no' | 'abstain';
export type VoteSignal = 'funding' | 'valid' | 'delete' | 'endorsed';

export class ProposalVote {
  outpoint: string;
  proTxHash: string | null;
  proposalHash?: string;
  time: Date;
  outcome: VoteOutcome | string;
  signal: VoteSignal | string;

  constructor(outpoint: string, time: Date, outcome: string, signal: string, proTxHash: string | null = null, proposalHash?: string) {
    this.outpoint = outpoint;
    this.proTxHash = proTxHash;
    this.proposalHash = proposalHash;
    this.time = time;
    this.outcome = outcome;
    this.signal = signal;
  }

  static fromRaw(value: string): ProposalVote | null {
    const parts = value.split(':');

    if (parts.length < 4) {
      return null;
    }

    const [outpoint, timeStr, outcome, signal] = parts;
    const timeSec = Number(timeStr);

    if (!Number.isFinite(timeSec)) {
      return null;
    }

    return new ProposalVote(outpoint, new Date(timeSec * 1000), outcome, signal);
  }
}