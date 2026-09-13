import {AddressInfoObject, AddressInfoRow} from "../types/address";

export default class AddressInfo {
  address: string | null;
  balance: string | null;
  txCount: number | null;

  constructor(address?: string, balance?: string, txCount?: number) {
    this.address = address ?? null;
    this.balance = balance ?? null;
    this.txCount = txCount ?? null;
  }

  static fromRow({address, balance, tx_count}: AddressInfoRow): AddressInfo {
    return new AddressInfo(address, balance, Number(tx_count));
  }

  static fromObject({address, balance, txCount}: AddressInfoObject): AddressInfo {
    return new AddressInfo(address, balance, txCount);
  }
}