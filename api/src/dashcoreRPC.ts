import RpcClient from '@dashevo/dashd-rpc/promise';
import ServiceNotAvailableError from './errors/ServiceNotAvailableError';

export type GovernanceObjectSignal = "valid" | "funding" | "delete" | "endorsed" | "all";
type GovernanceObjectType = "proposals" | "triggers" | "all";

export interface GovernanceObjectDetails {
  DataHex: string;
  DataString: string;
  Hash: string;
  CollateralHash: string;
  ObjectType: 1 | 2 | 3;
  CreationTime: number;
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
}

type GovernanceObjectsResult = Record<string, GovernanceObjectDetails>;

export class DashCoreRPC {
  rpc: RpcClient

  constructor() {
    const config = {
      protocol: 'http',
      host: process.env.CORE_RPC_HOST,
      port: Number(process.env.CORE_RPC_PORT),
      user: process.env.CORE_RPC_USER,
      pass: process.env.CORE_RPC_PASSWORD,
    };

    this.rpc = new RpcClient(config);
  }

  async callMethod(method: string, args: any[], onError: (e: any) => any = () => {}): Promise<any> {
    try {
      const { result } = await this.rpc[method](...args);
      return result;
    } catch (e: any) {
      const handlerResponse = await onError(e);

      if (handlerResponse) {
        return handlerResponse;
      }

      console.error(e);
      throw new ServiceNotAvailableError(e.code);
    }
  }

  async getBlock(hash: string, format: number = 1): Promise<any> {
    return this.callMethod('getblock', [hash, format]);
  }

  async getTransactionByHash(hash: string, json: number = 1): Promise<any> {
    return this.callMethod('getRawTransaction', [hash, json]);
  }

  async getMasternodes(): Promise<any> {
    return this.callMethod('masternode', ['list', 'json', 'ENABLED']);
  }

  async getGovernanceObjects(signal: GovernanceObjectSignal = "all", type: GovernanceObjectType = "all"): Promise<GovernanceObjectsResult> {
    return this.callMethod('gobject', ['list', signal, type]);
  }
}
