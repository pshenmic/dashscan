import {XpubSummaryObject, XpubSummaryRow} from "../types/xpub";

export default class XpubSummary {
  balance: string | null;
  received: string | null;
  sent: string | null;
  txCount: number | null;
  addressCount: number | null;
  usedAddressCount: number | null;
  nextUnused: { receive: number | null; change: number | null } | null;

  constructor(
    balance?: string,
    received?: string,
    sent?: string,
    txCount?: number,
    addressCount?: number,
    usedAddressCount?: number,
    nextUnused?: { receive: number | null; change: number | null },
  ) {
    this.balance = balance ?? null;
    this.received = received ?? null;
    this.sent = sent ?? null;
    this.txCount = txCount ?? null;
    this.addressCount = addressCount ?? null;
    this.usedAddressCount = usedAddressCount ?? null;
    this.nextUnused = nextUnused ?? null;
  }

  static fromRow({balance, received, sent, tx_count}: XpubSummaryRow): XpubSummary {
    return new XpubSummary(balance, received, sent, Number(tx_count));
  }

  static fromObject({balance, received, sent, txCount, addressCount, usedAddressCount, nextUnused}: XpubSummaryObject): XpubSummary {
    return new XpubSummary(balance, received, sent, txCount, addressCount, usedAddressCount, nextUnused);
  }
}
