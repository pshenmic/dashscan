export interface MasternodeStatsRow {
  masternodes_total_count?: string | number | null;
  evo_masternodes_count?: string | number | null;
  regular_masternodes_count?: string | number | null;
  evo_enabled_masternodes?: string | number | null;
  regular_enabled_masternodes?: string | number | null;
}

export default class MasternodeStats {
  total: number | null;
  evo: number | null;
  regular: number | null;
  evoDisabled: number | null;
  evoEnabled: number | null;
  regularDisabled: number | null;
  regularEnabled: number | null;
  requiredProposalVotes: number | null;

  constructor(total?: number, evo?: number, regular?: number, regularDisabled?: number, regularEnabled?: number, evoDisabled?: number, evoEnabled?: number, requiredProposalVotes?: number) {
    this.total = total ?? null;
    this.evo = evo ?? null;
    this.regular = regular ?? null;
    this.evoDisabled = evoDisabled ?? null;
    this.evoEnabled = evoEnabled ?? null;
    this.regularDisabled = regularDisabled ?? null;
    this.regularEnabled = regularEnabled ?? null;
    this.requiredProposalVotes = requiredProposalVotes ?? null;
  }

  static fromRow({masternodes_total_count, evo_masternodes_count, regular_masternodes_count, evo_enabled_masternodes, regular_enabled_masternodes}: MasternodeStatsRow): MasternodeStats {
    const evoCount = Number(evo_masternodes_count??0);
    const regularCount = Number(regular_masternodes_count??0);
    const evoEnabledCount = Number(evo_enabled_masternodes??0);
    const regularEnabledCount = Number(regular_enabled_masternodes??0);

    const requiredProposalVotes = Math.ceil((regularEnabledCount + evoEnabledCount * 4) * 0.1);

    return new MasternodeStats(
      Number(masternodes_total_count),
      evoCount,
      regularCount,
      regularCount-regularEnabledCount,
      regularEnabledCount,
      evoCount-evoEnabledCount,
      evoEnabledCount,
      requiredProposalVotes,
    );
  }
}