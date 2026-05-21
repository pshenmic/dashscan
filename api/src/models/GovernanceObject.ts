import {GovernanceObjectType} from "../enums/GovernanceObjectType";
import {GovernanceObjectDetails} from "../dashcoreRPC";
import {ProposalData} from "./ProposalData";
import {VoteResult} from "./VoteResult";
import {ProposalVote} from "./ProposalVote";

export class GovernanceObject {
  dataHex: string | null;
  data: ProposalData | null;
  hash: string | null;
  collateralHash: string | null;
  objectType: (keyof typeof GovernanceObjectType) | null;
  creationTime: Date | null;
  signingMasternode?: string | null;
  absoluteYesCount: number | null;
  yesCount: number | null;
  noCount: number | null;
  abstainCount: number | null;
  localValidity: boolean | null;
  isValidReason: string | null;
  enoughVotes: boolean | null;
  enoughFunds: boolean | null;
  fundingResult: VoteResult | null;
  validResult: VoteResult | null;
  deleteResult: VoteResult | null;
  endorsedResult: VoteResult | null;
  votes: ProposalVote[] | null;

  constructor(
    dataHex?: string,
    data?: ProposalData,
    hash?: string,
    collateralHash?: string,
    objectType?: keyof typeof GovernanceObjectType,
    creationTime?: Date,
    absoluteYesCount?: number,
    yesCount?: number,
    noCount?: number,
    abstainCount?: number,
    localValidity?: boolean,
    isValidReason?: string,
    signingMasternode?: string,
    enoughVotes?: boolean,
    enoughFunds?: boolean,
    fundingResult?: VoteResult | null,
    validResult?: VoteResult | null,
    deleteResult?: VoteResult | null,
    endorsedResult?: VoteResult | null,
  ) {
    this.dataHex = dataHex ?? null;
    this.data = data ?? null;
    this.hash = hash ?? null;
    this.collateralHash = collateralHash ?? null;
    this.objectType = objectType ?? null;
    this.creationTime = creationTime ?? null;
    this.absoluteYesCount = absoluteYesCount ?? null;
    this.yesCount = yesCount ?? null;
    this.noCount = noCount ?? null;
    this.abstainCount = abstainCount ?? null;
    this.localValidity = localValidity ?? null;
    this.isValidReason = isValidReason ?? null;
    this.signingMasternode = signingMasternode ?? null;
    this.enoughVotes = enoughVotes ?? null;
    this.enoughFunds = enoughFunds ?? null;
    this.fundingResult = fundingResult ?? null;
    this.validResult = validResult ?? null;
    this.deleteResult = deleteResult ?? null;
    this.endorsedResult = endorsedResult ?? null;
    this.votes = null;
  }

  static fromObject(obj: GovernanceObjectDetails): GovernanceObject {
    const data = obj.DataString != null ? JSON.parse(obj.DataString) : null

    return new GovernanceObject(
      obj.DataHex,
      data != null ? ProposalData.fromObject(data) : null,
      obj.Hash,
      obj.CollateralHash,
      GovernanceObjectType[obj.ObjectType] as keyof typeof GovernanceObjectType,
      new Date(obj.CreationTime * 1000),
      obj.AbsoluteYesCount,
      obj.YesCount,
      obj.NoCount,
      obj.AbstainCount,
      obj.fLocalValidity,
      obj.IsValidReason,
      obj.SigningMasternode,
      undefined,
      undefined,
      VoteResult.fromRaw((obj as any).FundingResult),
      VoteResult.fromRaw((obj as any).ValidResult),
      VoteResult.fromRaw((obj as any).DeleteResult),
      VoteResult.fromRaw((obj as any).EndorsedResult),
    );
  }
}