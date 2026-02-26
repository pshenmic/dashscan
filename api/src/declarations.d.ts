declare module '@dashevo/dashd-rpc/promise' {
  class RpcClient {
    constructor(config: {
      protocol: string;
      host: string | undefined;
      port: number;
      user: string | undefined;
      pass: string | undefined;
    });
    [method: string]: (...args: any[]) => Promise<{ result: any }>;
  }
  export = RpcClient;
}