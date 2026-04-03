interface ProposalDataRawObject {
  end_epoch?: number | null,
  name?: string | null,
  payment_address?: string | null,
  payment_amount?: number | null,
  start_epoch?: number | null,
  type?: number | null,
  url?: string | null
}

export class ProposalData {
  endEpoch: number | null;
  startEpoch: number | null;
  name: string | null;
  paymentAddress: string | null;
  paymentAmount: number | null;
  type: number | null;
  url: string | null;

  constructor(endEpoch?: number, name?: string, paymentAddress?: string, paymentAmount?: number, startEpoch?: number, type?: number, url?: string | null) {
    this.endEpoch = endEpoch ?? null;
    this.startEpoch = startEpoch ?? null;
    this.name = name ?? null;
    this.paymentAddress = paymentAddress ?? null;
    this.paymentAmount = paymentAmount ?? null;
    this.type = type ?? null;
    this.url = url ?? null;
  }

  static fromObject({end_epoch, name, payment_address, payment_amount, start_epoch, type, url}: ProposalDataRawObject) {
    return new ProposalData(
      end_epoch,
      name,
      payment_address,
      payment_amount,
      start_epoch,
      type,
      url
    )
  }
}