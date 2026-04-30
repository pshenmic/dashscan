import RpcClient from '@dashevo/dashd-rpc/promise';
import ServiceNotAvailableError from './errors/ServiceNotAvailableError';

export interface UtxoInfoRPC {
  height: number;
  bestblock: string;
  txouts: number;
  bogosize: number;
  hash_serialized_2: string;
  total_amount: number;
  transactions: number;
  disk_size: number;
}

export interface BlockchainInfoRPC {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: string;
  difficulty: number;
  mediantime: number;
  verificationprogress: number;
  initialblockdownload: boolean;
  chainwork: string;
  size_on_disk: number;
  pruned: boolean;
  pruneheight?: number;
  automatic_pruning?: boolean;
  prune_target_size?: number;
  softforks: any;
  warnings: string;
}


export interface TransactionRPC {
  in_active_chain?: boolean;
  txid: string;
  size: number;
  version: number;
  type: number;
  locktime: number;
  vin: {
    txid?: string;
    vout?: number;
    scriptSig?: {
      asm: string;
      hex: string;
    };
    coinbase?: string;
    value?: number;
    valueSat?: number;
    addresses?: string[];
    sequence: number;
  }[];
  vout: {
    value: number;
    valueSat: number;
    n: number;
    scriptPubKey: {
      asm: string;
      desc: string;
      hex: string;
      type?:
        | "pubkey"
        | "pubkeyhash"
        | "scripthash"
        | "multisig"
        | "nulldata"
        | "nonstandard";
    };
    address?: string;
  }[];
  extraPayloadSize?: number;
  extraPayload?: string;
  hex: string;
  blockhash?: string;
  height?: number;
  confirmations?: number;
  time?: number;
  blocktime?: number;
  instantlock: boolean;
  instantlock_internal: boolean;
  chainlock: boolean;
}

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

export interface GovernanceInfoRPC {
  governanceminquorum: number;
  proposalfee: number;
  superblockcycle: number;
  superblockmaturitywindow: number;
  lastsuperblock: number;
  nextsuperblock: number;
  fundingthreshold: number;
  governancebudget: number;
}

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

  async getTransactionByHash(hash: string, json: number = 1): Promise<TransactionRPC> {
    return this.callMethod('getRawTransaction', [hash, json]);
  }

  async getMasternodes(): Promise<any> {
    return this.callMethod('masternode', ['list', 'json', 'ENABLED']);
  }

  async getGovernanceObjects(signal: GovernanceObjectSignal = "all", type: GovernanceObjectType = "all"): Promise<GovernanceObjectsResult> {
    return this.callMethod('gobject', ['list', signal, type]);
  }

  async getSuperblockBudget(superblockHeight: number): Promise<number> {
    return this.callMethod('getsuperblockbudget', [superblockHeight]);
  }

  async getGovernanceInfo(): Promise<GovernanceInfoRPC> {
    return this.callMethod('getgovernanceinfo', []);
  }

  async getMemPoolTransactionHashes(): Promise<string[]> {
    return this.callMethod('getrawmempool', []);
  }

  async getBlockCount(): Promise<number> {
    return this.callMethod('getBlockCount', []);
  }

  async getChainInfo(): Promise<BlockchainInfoRPC> {
    return this.callMethod('getblockchaininfo', []);
  }

  async getUtxoInfo(): Promise<UtxoInfoRPC> {
    return this.callMethod('gettxoutsetinfo', []);
  }
}
