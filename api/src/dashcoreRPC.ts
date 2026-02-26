import RpcClient from '@dashevo/dashd-rpc/promise';
import ServiceNotAvailableError from './errors/ServiceNotAvailableError';

const config = {
  protocol: 'http',
  host: process.env.CORE_RPC_HOST,
  port: Number(process.env.CORE_RPC_PORT),
  user: process.env.CORE_RPC_USER,
  pass: process.env.CORE_RPC_PASSWORD,
};

const rpc = new RpcClient(config);

export default class DashCoreRPC {
  static async callMethod(method: string, args: any[], onError: (e: any) => any = () => {}): Promise<any> {
    try {
      const { result } = await rpc[method](...args);
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

  static async getBlock(hash: string, format: number = 1): Promise<any> {
    return this.callMethod('getblock', [hash, format]);
  }

  static async getTransactionByHash(hash: string, json: number = 1): Promise<any> {
    return this.callMethod('getRawTransaction', [hash, json]);
  }
}
