import {GovernanceObjectType} from "../enums/GovernanceObjectType";
import {GovernanceObjectDetails} from "../dashcoreRPC";

export class GovernanceObject {
  dataHex: string;
  dataString: string;
  hash: string;
  collateralHash: string;
  objectType: keyof typeof GovernanceObjectType;
  creationTime: Date;
  signingMasternode?: string;
  absoluteYesCount: number;
  yesCount: number;
  noCount: number;
  abstainCount: number;
  localValidity: boolean;
  isValidReason: string;
  cachedValid: boolean;
  cachedFunding: boolean;
  cachedDelete: boolean;
  cachedEndorsed: boolean;

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
    localValidity: boolean,
    isValidReason: string,
    cachedValid: boolean,
    cachedFunding: boolean,
    cachedDelete: boolean,
    cachedEndorsed: boolean,
    signingMasternode?: string,
  ) {
    this.dataHex = dataHex;
    this.dataString = dataString;
    this.hash = hash;
    this.collateralHash = collateralHash;
    this.objectType = objectType;
    this.creationTime = creationTime;
    this.absoluteYesCount = absoluteYesCount;
    this.yesCount = yesCount;
    this.noCount = noCount;
    this.abstainCount = abstainCount;
    this.localValidity = localValidity;
    this.isValidReason = isValidReason;
    this.cachedValid = cachedValid;
    this.cachedFunding = cachedFunding;
    this.cachedDelete = cachedDelete;
    this.cachedEndorsed = cachedEndorsed;
    this.signingMasternode = signingMasternode;
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