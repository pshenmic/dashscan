interface AddressRow {
  address?: string;
  first_seen_block?: string;
  first_seen_tx?: string;
  last_seen_block?: string;
  last_seen_tx?: string;
  tx_count?: string;
  received?: string;
  sent?: string;
}

interface AddressObject {
  address?: string;
  firstSeenBlock?: string;
  firstSeenTx?: string;
  lastSeenBlock?: string;
  lastSeenTx?: string;
  txCount?: number;
  received?: string;
  sent?: string;
  balance?: string;
}

export default class Address {
  address?: string;
  firstSeenBlock?: string;
  firstSeenTx?: string;
  lastSeenBlock?: string;
  lastSeenTx?: string;
  txCount?: number;
  received?: string;
  sent?: string;
  balance?: string;

  constructor(
    address?: string,
    firstSeenBlock?: string,
    firstSeenTx?: string,
    lastSeenBlock?: string,
    lastSeenTx?: string,
    txCount?: number,
    received?: string,
    sent?: string,
    balance?: string,
  ) {
    this.address = address ?? null;
    this.firstSeenBlock = firstSeenBlock ?? null;
    this.firstSeenTx = firstSeenTx ?? null;
    this.lastSeenBlock = lastSeenBlock ?? null;
    this.lastSeenTx = lastSeenTx ?? null;
    this.txCount = txCount ?? null;
    this.received = received ?? null;
    this.sent = sent ?? null;
    this.balance = balance ?? null;
  }

  static fromRow({ address, first_seen_block, first_seen_tx, last_seen_block, last_seen_tx, tx_count, received, sent }: AddressRow): Address {
    return new Address(address, first_seen_block, first_seen_tx, last_seen_block, last_seen_tx, Number(tx_count), received, sent);
  }

  static fromObject({address, lastSeenBlock, lastSeenTx, firstSeenBlock, firstSeenTx, sent, received, txCount, balance}: AddressObject): Address {
    return new Address(address, firstSeenBlock, firstSeenTx, lastSeenBlock, lastSeenTx, txCount, received, sent, balance);
  }
}