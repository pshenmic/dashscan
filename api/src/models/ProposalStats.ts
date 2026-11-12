export default class ProposalStats {
  active: number | null;
  previousActive: number | null;

  constructor(active?: number, previousActive?: number) {
    this.active = active ?? null;
    this.previousActive = previousActive ?? null;
  }
}
