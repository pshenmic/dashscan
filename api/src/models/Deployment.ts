import {DeploymentRPC} from "../dashcoreRPC";

export default class Deployment {
  id: string | null;
  type: string | null;
  active: boolean | null;
  height: number | null;
  status: string | null;
  since: number | null;
  ehfHeight: number | null;

  constructor(id?: string, type?: string, active?: boolean, height?: number, status?: string, since?: number, ehfHeight?: number) {
    this.id = id ?? null;
    this.type = type ?? null;
    this.active = active ?? null;
    this.height = height ?? null;
    this.status = status ?? null;
    this.since = since ?? null;
    this.ehfHeight = ehfHeight ?? null;
  }

  static fromRPC(id: string, {type, active, height, bip9}: DeploymentRPC): Deployment {
    return new Deployment(id, type, active, height, bip9?.status, bip9?.since, bip9?.ehf_height);
  }
}
