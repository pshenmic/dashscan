import {XpubAddressObject} from "../types/xpub";

export default class XpubAddress {
  address: string | null;
  branch: number | null;
  index: number | null;
  used: boolean | null;

  constructor(address?: string, branch?: number, index?: number, used?: boolean) {
    this.address = address ?? null;
    this.branch = branch ?? null;
    this.index = index ?? null;
    this.used = used ?? null;
  }

  static fromObject({address, branch, index, used}: XpubAddressObject): XpubAddress {
    return new XpubAddress(address, branch, index, used);
  }

  static fromObjects(objects: XpubAddressObject[]): XpubAddress[] {
    return objects.map(XpubAddress.fromObject);
  }
}
