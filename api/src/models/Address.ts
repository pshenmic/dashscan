interface AddressRow {
  address: string;
  creation_height: number;
}

interface AddressObject {
  address?: string;
  creationHeight?: number;
}

export default class Address {
  address: string | null;
  creationHeight: number | null;

  constructor(address?: string, creationHeight?: number) {
    this.address = address ?? null;
    this.creationHeight = creationHeight ?? null;
  }

  static fromRow({ address, creation_height }: AddressRow): Address {
    return new Address(address, creation_height);
  }

  static fromObject({ address, creationHeight }: AddressObject): Address {
    return new Address(address, creationHeight);
  }
}
