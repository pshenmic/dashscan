interface AddressRow {
  address: string;
  first_seen_block: number;
  first_seen_tx: string;
  last_seen_block: number;
  last_seen_tx: string;
}

export default class Address {
  address?: string;
  firstSeenBlock?: number;
  firstSeenTx?: string;
  lastSeenBlock?: number;
  lastSeenTx?: string;

  constructor(address?: string, firstSeenBlock?: number, firstSeenTx?: string, lastSeenBlock?: number, lastSeenTx?: string) {
    this.address = address ?? null;
    this.firstSeenBlock = firstSeenBlock ?? null;
    this.firstSeenTx = firstSeenTx ?? null;
    this.lastSeenBlock = lastSeenBlock ?? null;
    this.lastSeenTx = lastSeenTx ?? null;
  }

  static fromRow({ address, first_seen_block, first_seen_tx, last_seen_block, last_seen_tx }: AddressRow): Address {
    return new Address(address, Number(first_seen_block), first_seen_tx, Number(last_seen_block), last_seen_tx);
  }
}
