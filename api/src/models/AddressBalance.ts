interface AddressBalanceRow {
  address?: string;
  balance?: string;
}

interface AddressBalanceObject {
  address?: string;
  balance?: string;
  concentration?: string;
}

export default class AddressBalance {
  address: string | null;
  balance: string | null;
  concentration: string | null;

  constructor(address?: string, balance?: string, concentration?: string) {
    this.address = address ?? null;
    this.balance = balance ?? null;
    this.concentration = concentration ?? null;
  }

  static fromRow({address, balance}: AddressBalanceRow): AddressBalance {
    return new AddressBalance(
      address,
      balance,
    );
  }

  static fromObject({address, balance, concentration}: AddressBalanceObject): AddressBalance {
    return new AddressBalance(address, balance, concentration);
  }
}