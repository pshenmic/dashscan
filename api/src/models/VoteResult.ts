export interface VoteResultRaw {
  AbsoluteYesCount?: number;
  YesCount?: number;
  NoCount?: number;
  AbstainCount?: number;
}

export class VoteResult {
  absoluteYesCount: number;
  yesCount: number;
  noCount: number;
  abstainCount: number;

  constructor(absoluteYesCount: number, yesCount: number, noCount: number, abstainCount: number) {
    this.absoluteYesCount = absoluteYesCount;
    this.yesCount = yesCount;
    this.noCount = noCount;
    this.abstainCount = abstainCount;
  }

  static fromRaw(raw?: VoteResultRaw | null): VoteResult | null {
    if (raw == null) {
      return null;
    }

    return new VoteResult(
      raw.AbsoluteYesCount ?? 0,
      raw.YesCount ?? 0,
      raw.NoCount ?? 0,
      raw.AbstainCount ?? 0,
    );
  }
}