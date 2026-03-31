import {GovernanceObjectType} from "../enums/GovernanceObjectType";
import {GovernanceObjectDetails} from "../dashcoreRPC";

export class GovernanceObject {
  DataHex: string;
  DataString: string;
  Hash: string;
  CollateralHash: string;
  ObjectType: keyof typeof GovernanceObjectType;
  CreationTime: Date;
  SigningMasternode?: string;
  AbsoluteYesCount: number;
  YesCount: number;
  NoCount: number;
  AbstainCount: number;
  fLocalValidity: boolean;
  IsValidReason: string;
  fCachedValid: boolean;
  fCachedFunding: boolean;
  fCachedDelete: boolean;
  fCachedEndorsed: boolean;

  constructor(
    dataHex: string,
    dataString: string,
    hash: string,
    collateralHash: string,
    objectType: keyof typeof GovernanceObjectType,
    creationTime: Date,
    absoluteYesCount: number,
    yesCount: number,
    noCount: number,
    abstainCount: number,
    fLocalValidity: boolean,
    isValidReason: string,
    fCachedValid: boolean,
    fCachedFunding: boolean,
    fCachedDelete: boolean,
    fCachedEndorsed: boolean,
    signingMasternode?: string,
  ) {
    this.DataHex = dataHex;
    this.DataString = dataString;
    this.Hash = hash;
    this.CollateralHash = collateralHash;
    this.ObjectType = objectType;
    this.CreationTime = creationTime;
    this.AbsoluteYesCount = absoluteYesCount;
    this.YesCount = yesCount;
    this.NoCount = noCount;
    this.AbstainCount = abstainCount;
    this.fLocalValidity = fLocalValidity;
    this.IsValidReason = isValidReason;
    this.fCachedValid = fCachedValid;
    this.fCachedFunding = fCachedFunding;
    this.fCachedDelete = fCachedDelete;
    this.fCachedEndorsed = fCachedEndorsed;
    this.SigningMasternode = signingMasternode;
  }

  static fromObject(obj: GovernanceObjectDetails): GovernanceObject {
    return new GovernanceObject(
      obj.DataHex,
      obj.DataString,
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
      obj.fCachedValid,
      obj.fCachedFunding,
      obj.fCachedDelete,
      obj.fCachedEndorsed,
      obj.SigningMasternode,
    );
  }
}