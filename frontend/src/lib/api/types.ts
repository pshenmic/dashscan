export interface PaginationParams {
  page?: number;
  limit?: number;
  order?: "asc" | "desc";
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedResponse<T> {
  resultSet: T[];
  pagination: PaginationResult;
}

export interface ApiBlock {
  height: number;
  hash: string;
  version: number;
  timestamp: string;
  txCount: number;
  size: number;
  creditPoolBalance: number;
  difficulty: number;
  merkleRoot: string;
  previousBlockHash: string;
  confirmations: number;
  nonce: number;
  superblock?: boolean | null;
}

export interface ApiVIn {
  prevTxHash: string | null;
  vOutIndex: number | null;
  sequence: number | null;
  scriptSigASM: string | null;
  address: string | null;
  amount: number | null;
}

export interface ApiVOut {
  value: number;
  number: number;
  scriptPubKeyASM: string;
  address: string | null;
}

export interface ApiOutPoint {
  txId: string;
  vOut: number;
}

export interface ApiOutput {
  satoshis: string;
  script: string;
}

export interface ApiQfCommit {
  version: number;
  llmqType: number;
  quorumHash: string;
  quorumIndex: number | null;
  signers: string;
  validMembers: string;
  quorumPublicKey: string;
  quorumVvecHash: string;
  quorumSig: string;
  sig: string;
}

export interface ApiMnHfSignal {
  versionBit: number;
  quorumHash: string;
  sig: string;
}

export interface ApiProRegTxPayload {
  version: number;
  type: number;
  mode: number;
  collateralOutpoint: ApiOutPoint;
  ipAddress: string;
  port: number;
  keyIdOwner: string;
  keyIdVoting: string;
  pubKeyOperator: string;
  operatorReward: number;
  scriptPayout: string;
  inputsHash: string;
  platformNodeID: string;
  platformP2PPort: number;
  platformHTTPPort: number;
  payloadSig: string;
}

export interface ApiProUpServTxPayload {
  version: number;
  type: number;
  proTxHash: string;
  ipAddress: string;
  port: number;
  scriptOperatorPayout: string;
  inputsHash: string;
  platformNodeID: string;
  platformP2PPort: number;
  platformHTTPPort: number;
  payloadSig: string;
}

export interface ApiProUpRegTxPayload {
  version: number;
  proTxHash: string;
  mode: number;
  keyIdVoting: string;
  pubKeyOperator: string;
  scriptPayout: string;
  inputsHash: string;
  payloadSig: string;
}

export interface ApiProUpRevTxPayload {
  version: number;
  proTxHash: string;
  reason: number;
  inputsHash: string;
  payloadSig: string;
}

export interface ApiCbTxPayload {
  version: number;
  height: number;
  merkleRootMNList: string;
  merkleRootQuorums: string | null;
  bestCLHeightDiff: string | null;
  bestCLSignature: string | null;
  creditPoolBalance: string | null;
}

export interface ApiQcTxPayload {
  version: number;
  height: number;
  commitment: ApiQfCommit;
}

export interface ApiMnHfTxPayload {
  version: number;
  commitment: ApiMnHfSignal;
}

export interface ApiAssetLockTxPayload {
  version: number;
  count: number;
  outputs: ApiOutput[];
}

export interface ApiAssetUnlockTxPayload {
  version: number;
  index: string;
  fee: number;
  requestedHeight: number;
  quorumHash: string;
  quorumSig: string;
}

export type ApiExtraPayload =
  | ApiProRegTxPayload
  | ApiProUpServTxPayload
  | ApiProUpRegTxPayload
  | ApiProUpRevTxPayload
  | ApiCbTxPayload
  | ApiQcTxPayload
  | ApiMnHfTxPayload
  | ApiAssetLockTxPayload
  | ApiAssetUnlockTxPayload;

export interface ApiTransaction {
  hash: string;
  type: string | null;
  blockHeight: number;
  blockHash: string;
  amount: string | null;
  version: number;
  vIn: ApiVIn[];
  vOut: ApiVOut[];
  confirmations: number;
  instantLock: boolean | string | null;
  chainLocked?: boolean | null;
  coinjoin: boolean;
  multisig: boolean;
  size?: number | null;
  timestamp: string;
  extraPayload?: ApiExtraPayload | null;
}

export interface ApiAddress {
  address: string;
  firstSeenBlock: number;
  firstSeenTx: string;
  lastSeenBlock: number;
  lastSeenTx: string;
}

export interface ApiAddressDetail {
  address: string;
  firstSeenBlock: string | null;
  firstSeenBlockTimestamp: string | null;
  firstSeenTx: string | null;
  lastSeenBlock: string | null;
  lastSeenBlockTimestamp: string | null;
  lastSeenTx: string | null;
  txCount: string;
  received: string;
  sent: string;
  balance: string;
}

export interface ApiAddressBalancePoint {
  timestamp: string;
  data: { balance: string };
}

export interface ApiUtxoEntry {
  prevTxHash: string;
  vOutIndex: number;
  address: string;
  amount: string;
  sequence: number | null;
  scriptSigASM: string | null;
}

export interface GeoIpInfo {
  ipv4: string;
  countryCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface ApiMasternode {
  proTxHash: string;
  address: string;
  payee: string;
  status: string;
  type: string;
  posPenaltyScore: number;
  consecutivePayments: number;
  lastPaidTime: string | null;
  lastPaidBlock: number;
  ownerAddress: string;
  votingAddress: string;
  collateralAddress: string;
  pubKeyOperator: string;
  createdAt: string;
  updatedAt: string;
  geoIpInfo: GeoIpInfo | null;
}

export interface ApiTransactionsStatsEntry {
  timestamp: string;
  data: { count: number };
}

export interface ApiBlockTransactionsStatsEntry {
  timestamp: string;
  data: { avg: number };
}

export interface ApiHistoricalEntry {
  timestamp: number;
  value: number;
}

export interface SearchResponse {
  block: ApiBlock | null;
  transaction: ApiTransaction | null;
  masternode: ApiMasternode | null;
  address: ApiAddress | null;
}

export interface ApiGovernanceBudget {
  totalBudget: number;
  totalProposals: number;
  totalRequested: number;
  enoughVotesTotal: number;
  enoughVotesCount: number;
  enoughFundsTotal: number;
  enoughFundsCount: number;
  remainingAllPass: number;
  remainingEnoughVotes: number;
}

export interface ApiChainStats {
  chain: string | null;
  sizeOnDisk: number | null;
  difficulty: number | null;
  blockTime: number | null;
  transactionsPerSecond: number | null;
  transactionsPerMinute: number | null;
  latestHeight: number | null;
  hashRate: string | null;
  mempoolSize: number | null;
  nextSuperblockHeight: number | null;
  latestSuperblockHeight: number | null;
}

export interface ApiAddressBalanceEntry {
  address: string | null;
  balance: string | null;
  concentration: string | null;
}

export interface ApiTransactionsBreakdown {
  total: number | null;
  special: number | null;
  coinjoin: number | null;
  multisig: number | null;
  normal: number | null;
}

export interface ApiGovernanceObject {
  dataHex: string | null;
  endEpoch: number | null;
  startEpoch: number | null;
  name: string | null;
  paymentAddress: string | null;
  paymentAmount: number | null;
  type: number | null;
  url: string | null;
  hash: string | null;
  collateralHash: string | null;
  objectType: "Unknown" | "Proposal" | "Trigger" | null;
  creationTime: string | null;
  absoluteYesCount: number | null;
  yesCount: number | null;
  noCount: number | null;
  abstainCount: number | null;
  localValidity: boolean | null;
  isValidReason: string | null;
  enoughVotes?: boolean | null;
  enoughFunds?: boolean | null;
}

export type ApiVoteOutcome = "yes" | "no" | "abstain";

export type ApiVoteSignal = "funding" | "valid" | "delete" | "endorsed";

export interface ApiVoteResult {
  absoluteYesCount: number;
  yesCount: number;
  noCount: number;
  abstainCount: number;
}

export interface ApiProposalVote {
  outpoint: string;
  proTxHash: string | null;
  proposalHash?: string | null;
  time: string;
  outcome: ApiVoteOutcome;
  signal: ApiVoteSignal;
}

export interface ApiProposalDetail extends ApiGovernanceObject {
  fundingResult: ApiVoteResult | null;
  deleteResult: ApiVoteResult | null;
  endorsedResult: ApiVoteResult | null;
  votes: ApiProposalVote[] | null;
}

export interface ApiProposalVotesChartPoint {
  timestamp: string;
  data: { yes: number; no: number; abstain: number };
}
