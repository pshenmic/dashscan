# Dashscan API Documentation

Base URL: `http://<host>:<port>`

---

## Common Structures

### Pagination Query Parameters

All list endpoints accept the following query parameters:

| Parameter | Type    | Default | Constraints          | Description            |
|-----------|---------|---------|----------------------|------------------------|
| `page`    | integer | `1`     | minimum: 1           | Page number            |
| `limit`   | integer | `10`    | minimum: 0, max: 100 | Results per page       |
| `order`   | string  | `"asc"` | `"asc"` or `"desc"`  | Sort order             |

### Paginated Response

All list endpoints return this wrapper:

```json
{
  "resultSet": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42
  }
}
```

> `total` is `-1` when the result set is empty.

---

## Endpoints

### GET /status

Health check endpoint.

**Response `200`**

```json
{
  "status": "ok"
}
```

---

### GET /blocks

Returns a paginated list of blocks.

**Query Parameters:** [Pagination](#pagination-query-parameters)

**Response `200`**

```json
{
  "resultSet": [
    {
      "height": 100000,
      "hash": "000000000000abcd1234...",
      "version": 536870912,
      "timestamp": "2023-01-01T00:00:00.000Z",
      "txCount": 5,
      "size": 1234,
      "creditPoolBalance": 500000,
      "difficulty": 123456.789,
      "merkleRoot": "abcdef1234...",
      "previousBlockHash": "000000000000efgh5678...",
      "nonce": 987654321
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100000
  }
}
```

#### Block Object

| Field               | Type    | Description                              |
|---------------------|---------|------------------------------------------|
| `height`            | number  | Block height                             |
| `hash`              | string  | Block hash (64-char hex)                 |
| `version`           | number  | Block version                            |
| `timestamp`         | string  | ISO 8601 timestamp                       |
| `txCount`           | number  | Number of transactions in the block      |
| `size`              | number  | Block size in bytes                      |
| `creditPoolBalance` | number  | Credit pool balance at this block        |
| `difficulty`        | number  | Mining difficulty                        |
| `merkleRoot`        | string  | Merkle root hash                         |
| `previousBlockHash` | string  | Hash of the previous block               |
| `nonce`             | number  | Mining nonce                             |

---

### GET /block/:hash

Returns a single block by its hash.

**Path Parameters**

| Parameter | Type   | Constraints                    | Description      |
|-----------|--------|--------------------------------|------------------|
| `hash`    | string | 64-char alphanumeric           | Block hash       |

**Response `200`** — [Block Object](#block-object)

```json
{
  "height": 100000,
  "hash": "000000000000abcd1234...",
  "version": 536870912,
  "timestamp": "2023-01-01T00:00:00.000Z",
  "txCount": 5,
  "size": 1234,
  "creditPoolBalance": 500000,
  "difficulty": 123456.789,
  "merkleRoot": "abcdef1234...",
  "previousBlockHash": "000000000000efgh5678...",
  "nonce": 987654321
}
```

**Response `404`**

```json
{
  "error": "Block not found"
}
```

---

### GET /transactions

Returns a paginated list of transactions. Include pending transactions

**Query Parameters:** [Pagination](#pagination-query-parameters)

**Response `200`**

```json
{
  "resultSet": [
    {
      "hash": "abcdef1234...",
      "type": 0,
      "blockHeight": 100000,
      "blockHash": "000000000000abcd1234...",
      "amount": 100000000,
      "version": 3,
      "vIn": [...],
      "vOut": [...],
      "confirmations": 10,
      "instantLock": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 500
  }
}
```

---

### GET /transaction/:hash

Returns a single transaction by its hash.

**Path Parameters**

| Parameter | Type   | Constraints                    | Description          |
|-----------|--------|--------------------------------|----------------------|
| `hash`    | string | 64-char alphanumeric           | Transaction hash     |

**Response `200`** — [Transaction Object](#transaction-object)

```json
{
  "hash": "abcdef1234...",
  "type": 0,
  "blockHeight": 100000,
  "blockHash": "000000000000abcd1234...",
  "amount": 100000000,
  "version": 3,
  "vIn": [
    {
      "txId": "prevtxhash...",
      "vOut": 0,
      "sequence": 4294967295,
      "scriptSigASM": "OP_DUP OP_HASH160 ..."
    }
  ],
  "vOut": [
    {
      "value": "100000000",
      "number": 0,
      "scriptPubKeyASM": "OP_DUP OP_HASH160 ..."
    }
  ],
  "confirmations": 10,
  "instantLock": true
}
```

**Response `404`** — `"Transaction not found"`

#### Transaction Object

| Field          | Type     | Description                                     |
|----------------|----------|-------------------------------------------------|
| `hash`         | string   | Transaction hash (64-char hex)                  |
| `type`         | number   | Transaction type                                |
| `blockHeight`  | number   | Height of the block containing this transaction |
| `blockHash`    | string   | Hash of the block containing this transaction   |
| `amount`       | number   | Transaction amount in duffs                     |
| `version`      | number   | Transaction version                             |
| `vIn`          | VIn[]    | Array of transaction inputs                     |
| `vOut`         | VOut[]   | Array of transaction outputs                    |
| `confirmations`| number   | Number of confirmations                         |
| `instantLock`  | boolean  | Whether the transaction has an InstantSend lock  |

#### VIn Object

| Field          | Type   | Description                          |
|----------------|--------|--------------------------------------|
| `txId`         | string | Hash of the previous transaction     |
| `vOut`         | number | Output index in the previous tx      |
| `sequence`     | number | Sequence number                      |
| `scriptSigASM` | string | Input script in ASM format           |

#### VOut Object

| Field            | Type   | Description                          |
|------------------|--------|--------------------------------------|
| `value`          | string | Output value in duffs                |
| `number`         | number | Output index within the transaction  |
| `scriptPubKeyASM`| string | Output script in ASM format          |

---

### GET /transactions/height/:height

Returns a paginated list of transactions for a specific block height.

**Path Parameters**

| Parameter | Type    | Constraints  | Description   |
|-----------|---------|--------------|---------------|
| `height`  | integer | minimum: 1   | Block height  |

**Query Parameters:** [Pagination](#pagination-query-parameters)

**Response `200`**

```json
{
  "resultSet": [
    {
      "hash": "abcdef1234...",
      "type": 0,
      "blockHeight": 100000,
      "blockHash": "000000000000abcd1234...",
      "amount": 100000000,
      "version": 3,
      "vIn": [...],
      "vOut": [...],
      "confirmations": 10,
      "instantLock": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5
  }
}
```

**Response `400`** — `"Invalid height"`

---

### GET /addresses

Returns a paginated list of addresses.

**Query Parameters:** [Pagination](#pagination-query-parameters)

**Response `200`**

```json
{
  "resultSet": [
    {
      "address": "XdAUmwtig27HBG6WfYyHAzP8n6XC9jESEw",
      "firstSeenBlock": 1000,
      "firstSeenTx": "abcdef1234...",
      "lastSeenBlock": 100000,
      "lastSeenTx": "fedcba4321..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 200
  }
}
```

#### Address Object

| Field           | Type   | Description                                  |
|-----------------|--------|----------------------------------------------|
| `address`       | string | Dash address                                 |
| `firstSeenBlock`| number | Block height where address was first seen    |
| `firstSeenTx`   | string | Transaction hash where address was first seen|
| `lastSeenBlock` | number | Block height where address was last seen     |
| `lastSeenTx`    | string | Transaction hash where address was last seen |

---

### GET /transactions/history

Returns transaction counts grouped by hour for the past 24 hours.

**Response `200`**

```json
[
  { "timestamp": 1741305600, "count": 142 },
  { "timestamp": 1741309200, "count": 98 }
]
```

| Field       | Type   | Description                          |
|-------------|--------|--------------------------------------|
| `timestamp` | number | Hour start as Unix timestamp (seconds) |
| `count`     | number | Number of transactions in that hour  |

> Hours with zero transactions are omitted.

---

### GET /search

Searches across blocks, transactions, masternodes, and addresses. Input type is detected automatically.

| Input pattern             | Queried entities                              |
|---------------------------|-----------------------------------------------|
| Pure integer              | Block by height                               |
| 64-char hex string        | Block by hash, transaction by hash, masternode by proTxHash |
| Dash address (`X`, `y`, `7`, `8` prefix) | Address by address              |
| Anything else             | Returns all nulls                             |

**Query Parameters**

| Parameter | Type   | Constraints     | Description        |
|-----------|--------|-----------------|--------------------|
| `query`   | string | minLength: 1    | Search term        |

**Response `200`**

```json
{
  "block": { "height": 100000, "hash": "000abc...", ... } ,
  "transaction": null,
  "masternode": null,
  "address": null
}
```

Each field is either the matched object (same shape as its individual endpoint) or `null`.

**Response `400`** — Missing or empty `query` parameter

---

### GET /masternodes

Returns a paginated list of masternodes, ordered by `lastPaidBlock` ascending.

**Query Parameters:** [Pagination](#pagination-query-parameters)

**Response `200`**

```json
{
  "resultSet": [
    {
      "proTxHash": "abcdef1234...",
      "address": "1.2.3.4:9999",
      "payee": "XaBC...",
      "status": "ENABLED",
      "type": "Regular",
      "posPenaltyScore": 0,
      "consecutivePayments": 0,
      "lastPaidTime": 1741305600,
      "lastPaidBlock": 1999000,
      "ownerAddress": "XoBC...",
      "votingAddress": "XvBC...",
      "collateralAddress": "XcBC...",
      "pubKeyOperator": "abc123...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3800
  }
}
```

#### Masternode Object

| Field                 | Type    | Description                                      |
|-----------------------|---------|--------------------------------------------------|
| `proTxHash`           | string  | Provider transaction hash                        |
| `address`             | string  | IP address and port                              |
| `payee`               | string  | Payout address                                   |
| `status`              | string  | Masternode status (e.g. `ENABLED`)               |
| `type`                | string  | Masternode type (e.g. `Regular`, `Evo`)          |
| `posPenaltyScore`     | number  | Proof-of-service penalty score                   |
| `consecutivePayments` | number  | Number of consecutive payments received          |
| `lastPaidTime`        | number  | Unix timestamp of last payment                   |
| `lastPaidBlock`       | number  | Block height of last payment                     |
| `ownerAddress`        | string  | Owner address                                    |
| `votingAddress`       | string  | Voting address                                   |
| `collateralAddress`   | string  | Collateral address                               |
| `pubKeyOperator`      | string  | Operator public key                              |
| `createdAt`           | string  | ISO 8601 timestamp when first indexed            |
| `updatedAt`           | string  | ISO 8601 timestamp of last update                |

---

### GET /price/:currency

Returns the current DASH price for the given currency. Cached for 60 minutes. Falls back to Kraken if CoinGecko is unavailable.

**Path Parameters**

| Parameter  | Type   | Constraints        | Description   |
|------------|--------|--------------------|---------------|
| `currency` | string | `"usd"` or `"btc"` | Target currency |

**Response `200`**

```json
{ "usd": 42.5 }
```

```json
{ "btc": 0.00042 }
```

**Response `400`** — Invalid currency (not `usd` or `btc`)

---

### GET /price/:currency/historical

Returns DASH price for the past 24 hours, compacted to one point per hour. Cached for 60 minutes. For `usd`, falls back to Kraken if CoinGecko is unavailable. For `btc`, only CoinGecko is used.

**Path Parameters**

| Parameter  | Type   | Constraints        | Description   |
|------------|--------|--------------------|---------------|
| `currency` | string | `"usd"` or `"btc"` | Target currency |

**Response `200`**

```json
[
  { "timestamp": 1741305600, "value": 42.31 },
  { "timestamp": 1741309200, "value": 42.58 }
]
```

| Field       | Type   | Description                            |
|-------------|--------|----------------------------------------|
| `timestamp` | number | Hour start as Unix timestamp (seconds) |
| `value`     | number | DASH price in the requested currency   |

**Response `400`** — Invalid currency (not `usd` or `btc`)

---

### GET /marketcap/:currency

Returns the current DASH market cap for the given currency. Cached for 60 minutes. Provided by CoinGecko; no fallback available.

**Path Parameters**

| Parameter  | Type   | Constraints        | Description     |
|------------|--------|--------------------|-----------------|
| `currency` | string | `"usd"` or `"btc"` | Target currency |

**Response `200`**

```json
{ "usd": 1234567890 }
```

**Response `400`** — Invalid currency (not `usd` or `btc`)

---

### GET /marketcap/:currency/historical

Returns DASH market cap for the past 24 hours, compacted to one point per hour. Cached for 60 minutes. Provided by CoinGecko only.

**Path Parameters**

| Parameter  | Type   | Constraints        | Description     |
|------------|--------|--------------------|-----------------|
| `currency` | string | `"usd"` or `"btc"` | Target currency |

**Response `200`**

```json
[
  { "timestamp": 1741305600, "value": 1234567890 },
  { "timestamp": 1741309200, "value": 1235000000 }
]
```

| Field       | Type   | Description                            |
|-------------|--------|----------------------------------------|
| `timestamp` | number | Hour start as Unix timestamp (seconds) |
| `value`     | number | Market cap in the requested currency   |

**Response `400`** — Invalid currency (not `usd` or `btc`)

---

### GET /volume/:currency

Returns the current DASH 24h trading volume for the given currency. Cached for 60 minutes. Provided by CoinGecko; no fallback available.

**Path Parameters**

| Parameter  | Type   | Constraints        | Description     |
|------------|--------|--------------------|-----------------|
| `currency` | string | `"usd"` or `"btc"` | Target currency |

**Response `200`**

```json
{ "usd": 98765432 }
```

**Response `400`** — Invalid currency (not `usd` or `btc`)

---

### GET /volume/:currency/historical

Returns DASH trading volume for the past 24 hours, compacted to one point per hour. Cached for 60 minutes. For `usd`, falls back to Kraken if CoinGecko is unavailable. For `btc`, only CoinGecko is used.

**Path Parameters**

| Parameter  | Type   | Constraints        | Description     |
|------------|--------|--------------------|-----------------|
| `currency` | string | `"usd"` or `"btc"` | Target currency |

**Response `200`**

```json
[
  { "timestamp": 1741305600, "value": 98765432 },
  { "timestamp": 1741309200, "value": 97000000 }
]
```

| Field       | Type   | Description                              |
|-------------|--------|------------------------------------------|
| `timestamp` | number | Hour start as Unix timestamp (seconds)   |
| `value`     | number | Trading volume in the requested currency |

**Response `400`** — Invalid currency (not `usd` or `btc`)

---

### GET /governance/proposals

Returns a list of governance proposals from Dash Core RPC.

**Query Parameters**

| Parameter      | Type   | Default | Constraints                                               | Description                     |
|----------------|--------|---------|-----------------------------------------------------------|---------------------------------|
| `proposalType` | string | `null`  | `"valid"`, `"funding"`, `"delete"`, `"endorsed"`, `"all"` | Filter proposals by signal type |

**Response `200`**

```json
[
  {
    "dataHex": "5b5b2270726f706f73616c222c...",
    "data": {
      "endEpoch": 1776307317,
      "startEpoch": 1773258297,
      "name": "proposal-name",
      "paymentAddress": "XgNfgrEB9n6uCY9Pi1hb2foimxPdtiZ4Z2",
      "paymentAmount": 250,
      "type": 1,
      "url": "https://www.dashcentral.org/p/proposal-name"
    },
    "hash": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "collateralHash": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "objectType": "Proposal",
    "creationTime": "2024-01-01T00:00:00.000Z",
    "signingMasternode": "abcdef1234...",
    "absoluteYesCount": 150,
    "yesCount": 200,
    "noCount": 50,
    "abstainCount": 10,
    "localValidity": true,
    "isValidReason": ""
  }
]
```

#### Governance Proposal Object

| Field               | Type         | Description                                                 |
|---------------------|--------------|-------------------------------------------------------------|
| `dataHex`           | string       | Governance object info as hex string                        |
| `data`              | ProposalData | Decoded governance object data (see ProposalData below)     |
| `hash`              | string       | Hash of this governance object (64-char hex)                |
| `collateralHash`    | string       | Hash of the collateral payment transaction (64-char hex)    |
| `objectType`        | string       | Object type name: `"Unknown"`, `"Proposal"`, or `"Trigger"` |
| `creationTime`      | string       | ISO 8601 timestamp of object creation                       |
| `signingMasternode` | string       | Signing masternode's vin (only present in triggers)         |
| `absoluteYesCount`  | number       | Number of Yes votes minus number of No votes                |
| `yesCount`          | number       | Number of Yes votes                                         |
| `noCount`           | number       | Number of No votes                                          |
| `abstainCount`      | number       | Number of Abstain votes                                     |
| `localValidity`     | boolean      | Valid by the blockchain                                     |
| `isValidReason`     | string       | Validation error reason. Empty if no error                  |

#### ProposalData Object

| Field            | Type   | Description                                      |
|------------------|--------|--------------------------------------------------|
| `endEpoch`       | number | Unix timestamp of proposal end date              |
| `startEpoch`     | number | Unix timestamp of proposal start date            |
| `name`           | string | Proposal name                                    |
| `paymentAddress` | string | Dash address to receive payment if funded        |
| `paymentAmount`  | number | Requested payment amount in Dash                 |
| `type`           | number | Proposal type identifier                         |
| `url`            | string | URL with proposal details                        |

---

### GET /transactions/pending

Returns a list of pending transactions.

**Query Parameters:** [Pagination](#pagination-query-parameters)

**Response `200`**

```json
{
  "resultSet": [
    {
      "hash": "4b82593225c75ad9566fe2938291edc53afc3eb9e61ced51a47bb98264dc1cb4",
      "type": 0,
      "blockHeight": null,
      "blockHash": null,
      "timestamp": null,
      "amount": null,
      "version": 1,
      "vIn": null,
      "vOut": null,
      "confirmations": null,
      "instantLock": true,
      "chainLock": null
    },
    {
      "hash": "f1edc4f297148814c5df0b5ee831f58132929b022dfad98542f27f5d19fbb348",
      "type": 0,
      "blockHeight": null,
      "blockHash": null,
      "timestamp": null,
      "amount": null,
      "version": 2,
      "vIn": null,
      "vOut": null,
      "confirmations": null,
      "instantLock": true,
      "chainLock": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2
  }
}
```
