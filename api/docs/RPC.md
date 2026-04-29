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

| Parameter    | Type              | Default | Description                                                                 |
|--------------|-------------------|---------|-----------------------------------------------------------------------------|
| `superblock` | boolean \| null   | `null`  | When set, returns only blocks with this `superblock` flag value             |

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
      "nonce": 987654321,
      "confirmations": 42,
      "superblock": false
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

| Field               | Type    | Description                                                  |
|---------------------|---------|--------------------------------------------------------------|
| `height`            | number  | Block height                                                 |
| `hash`              | string  | Block hash (64-char hex)                                     |
| `version`           | number  | Block version                                                |
| `timestamp`         | string  | ISO 8601 timestamp                                           |
| `txCount`           | number  | Number of transactions in the block                          |
| `size`              | number  | Block size in bytes                                          |
| `creditPoolBalance` | number  | Credit pool balance at this block                            |
| `difficulty`        | number  | Mining difficulty                                            |
| `merkleRoot`        | string  | Merkle root hash                                             |
| `previousBlockHash` | string  | Hash of the previous block                                   |
| `nonce`             | number  | Mining nonce                                                 |
| `confirmations`     | number  | Number of confirmations (`tip height - block height + 1`)    |
| `superblock`        | boolean | Whether this block is a governance superblock                |

---

### GET /blocks/transactions/chart

Returns a time series of the average transaction count per block over a configurable time range.

**Query Parameters**

| Parameter         | Type   | Default               | Constraints          | Description                                              |
|-------------------|--------|-----------------------|----------------------|----------------------------------------------------------|
| `timestamp_start` | string | 1 hour ago (ISO 8601) |                      | Start of the time range                                  |
| `timestamp_end`   | string | now (ISO 8601)        |                      | End of the time range                                    |
| `intervals_count` | number | auto                  | minimum: 2, max: 100 | Number of buckets. When omitted, chosen automatically via `calculateInterval` |

**Response `200`**

```json
[
  {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "data": { "avg": 12.34 }
  },
  {
    "timestamp": "2024-01-02T00:00:00.000Z",
    "data": { "avg": 9.87 }
  }
]
```

| Field      | Type           | Description                                                          |
|------------|----------------|----------------------------------------------------------------------|
| `timestamp`  | string       | ISO 8601 start of the bucket                                         |
| `data.avg`   | number\|null | Average `tx_count` across all blocks in the bucket. `null` if no blocks fell in the bucket |

**Response `400`**

```json
{ "message": "start timestamp cannot be more than end timestamp" }
```

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
  "nonce": 987654321,
  "confirmations": 42,
  "superblock": false
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

**Query Parameters:** [Pagination](#pagination-query-parameters), plus optional filters:

| Parameter          | Type    | Constraints                                  | Description                                                                |
|--------------------|---------|----------------------------------------------|----------------------------------------------------------------------------|
| `transaction_type` | string  | one of the [transaction type](#transaction-types) names (e.g. `CLASSIC`, `COINBASE`) | Filter by transaction type                                                 |
| `coinjoin`         | boolean |                                              | Filter to (`true`) or exclude (`false`) CoinJoin-pattern transactions      |
| `block_height`     | integer | minimum: 1                                   | Filter to transactions in a specific block height                          |

**Response `200`**

```json
{
  "resultSet": [
    {
      "hash": "abcdef1234...",
      "type": "CLASSIC",
      "blockHeight": 100000,
      "blockHash": "000000000000abcd1234...",
      "amount": "100000000",
      "version": 3,
      "vIn": [
        {
          "prevTxHash": "prevtxhash...",
          "vOutIndex": 0,
          "sequence": null,
          "scriptSigASM": null,
          "amount": "100000",
          "address": "XdAUmwtig27HBG6WfYyHAzP8n6XC9jESEw"
        }
      ],
      "vOut": [
        {
          "value": "100000000",
          "number": 0,
          "scriptPubKeyASM": "OP_DUP OP_HASH160 ...",
          "address": "XdAUmwtig27HBG6WfYyHAzP8n6XC9jESEw"
        }
      ],
      "confirmations": 10,
      "instantLock": "0102375e39652fee756b492762510aea4087d57b486a89f2f78f52c840f02079052f000000007652da0e18a07bcde5a2205ff041dd0b14b4b7a81b2e0ccaf5118dfe79e56aba00000000f274ca0dd6640a9236dc987e5f09db412ed2bc37806ae90bc6f34f9fd36a7a28da45b260ae37978f3a8fb973c48418a92f41e1e2b77a9d720400000000000000abc1c3d6ddaccf322f655f59979d037badc840328b0da023f70d9d1adea046f9b4486c929ff0c15f2c9036d757ca44ae168e315ba07c19269d7b44c2bf722b811aa9ab0c978198ef3637d4b20e3e316e3459ed3d75dbbafd4966a4d571d32a0a",
      "chainLocked": true,
      "coinbaseAmount": null,
      "coinjoin": false
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
  "type": "CLASSIC",
  "blockHeight": 100000,
  "blockHash": "000000000000abcd1234...",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "amount": "100000000",
  "version": 3,
  "size": 226,
  "vIn": [
    {
      "prevTxHash": "prevtxhash...",
      "vOutIndex": 0,
      "sequence": null,
      "scriptSigASM": null,
      "amount": "100000",
      "address": "XdAUmwtig27HBG6WfYyHAzP8n6XC9jESEw"
    }
  ],
  "vOut": [
    {
      "value": "100000000",
      "number": 0,
      "scriptPubKeyASM": "OP_DUP OP_HASH160 ...",
      "address": "XdAUmwtig27HBG6WfYyHAzP8n6XC9jESEw"
    }
  ],
  "confirmations": 10,
  "instantLock": "0102375e39652fee756b...d571d32a0a",
  "chainLocked": true,
  "coinbaseAmount": null,
  "coinjoin": false
}
```

**Response `404`** — `"Transaction not found"`

#### Transaction Object

| Field            | Type           | Description                                                                                  |
|------------------|----------------|----------------------------------------------------------------------------------------------|
| `hash`           | string         | Transaction hash (64-char hex)                                                               |
| `type`           | string \| null | [Transaction type](#transaction-types) name (e.g. `CLASSIC`, `COINBASE`)                     |
| `blockHeight`    | number \| null | Height of the block containing this transaction                                              |
| `blockHash`      | string \| null | Hash of the block containing this transaction                                                |
| `timestamp`      | string \| null | ISO 8601 block timestamp, or `null` for pending transactions                                 |
| `amount`         | string \| null | Transferred value in duffs (sum of outputs less change), `null` if unavailable               |
| `version`        | number \| null | Transaction version (only populated on single-tx endpoint)                                   |
| `size`           | number \| null | Transaction size in bytes (only populated on single-tx endpoint)                             |
| `vIn`            | VIn[]          | Array of transaction inputs                                                                  |
| `vOut`           | VOut[]         | Array of transaction outputs                                                                 |
| `confirmations`  | number \| null | Number of confirmations                                                                      |
| `instantLock`    | string \| null | Raw InstantSend lock hex (ISLOCK), or `null` if not IS-locked                                |
| `chainLocked`    | boolean        | Whether the transaction's block has a ChainLock                                              |
| `coinbaseAmount` | string \| null | Coinbase reward in duffs for coinbase transactions, `null` for non-coinbase                  |
| `coinjoin`       | boolean        | Whether this transaction matches the CoinJoin (mixing) pattern                               |

#### Transaction Types

DIP-2 special-transaction type values. The numeric value is returned in the `type` field of the [Transaction Object](#transaction-object); the string name is what the `transaction_type` query filter on `GET /transactions` accepts.

| Value | Name                          | Description                       |
|-------|-------------------------------|-----------------------------------|
| `0`   | `CLASSIC`                     | Standard transaction              |
| `1`   | `PROVIDER_REGISTRATION`       | Masternode registration           |
| `2`   | `PROVIDER_UPDATE_SERVICE`     | Masternode service update         |
| `3`   | `PROVIDER_UPDATE_REGISTRAR`   | Masternode registrar update       |
| `4`   | `PROVIDER_UPDATE_REVOCATION`  | Masternode revocation             |
| `5`   | `COINBASE`                    | Coinbase transaction              |
| `6`   | `QUORUM_COMMITMENT`           | LLMQ commitment                   |
| `7`   | `MASTERNODE_HARD_FORK_SIGNAL` | Masternode hard-fork signal       |
| `8`   | `ASSET_LOCK`                  | Asset lock (Platform credit)      |
| `9`   | `ASSET_UNLOCK`                | Asset unlock (Platform withdraw)  |

#### VIn Object

| Field          | Type           | Description                               |
|----------------|----------------|-------------------------------------------|
| `prevTxHash`   | string \| null | Hash of the previous transaction          |
| `vOutIndex`    | number \| null | Output index in the previous tx           |
| `address`      | string \| null | Sender address, or `null` if unresolvable |
| `sequence`     | number \| null | Sequence number                           |
| `scriptSigASM` | string \| null | Input script in ASM format                |

#### VOut Object

| Field             | Type           | Description                                  |
|-------------------|----------------|----------------------------------------------|
| `value`           | string \| null | Output value in duffs                        |
| `number`          | number \| null | Output index within the transaction          |
| `scriptPubKeyASM` | string \| null | Output script in ASM format                  |
| `address`         | string \| null | Recipient address, or `null` if unresolvable |

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
      "type": "CLASSIC",
      "blockHeight": 100000,
      "blockHash": "000000000000abcd1234...",
      "amount": "100000000",
      "version": 3,
      "vIn": [...],
      "vOut": [...],
      "confirmations": 10,
      "instantLock": "0102375e...d571d32a0a",
      "chainLocked": true,
      "coinbaseAmount": null,
      "coinjoin": false
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

| Field            | Type   | Description                                   |
|------------------|--------|-----------------------------------------------|
| `address`        | string | Dash address                                  |
| `firstSeenBlock` | number | Block height where address was first seen     |
| `firstSeenTx`    | string | Transaction hash where address was first seen |
| `lastSeenBlock`  | number | Block height where address was last seen     |
| `lastSeenTx`     | string | Transaction hash where address was last seen  |

---

### GET /address/:address

Returns a single address with aggregated balance and activity stats.

**Path Parameters**

| Parameter | Type   | Constraints                              | Description  |
|-----------|--------|------------------------------------------|--------------|
| `address` | string | length 33–35, alphanumeric (`[0-9A-Za-z]`) | Dash address |

**Response `200`**

```json
{
  "address": "XdAUmwtig27HBG6WfYyHAzP8n6XC9jESEw",
  "firstSeenBlock": "000000000000abcd1234...",
  "firstSeenTx": "abcdef1234...",
  "lastSeenBlock": "000000000000efgh5678...",
  "lastSeenTx": "fedcba4321...",
  "txCount": "42",
  "received": "100000000",
  "sent": "25000000",
  "balance": "75000000"
}
```

#### Address Detail Object

| Field            | Type           | Description                                                            |
|------------------|----------------|------------------------------------------------------------------------|
| `address`        | string         | Dash address                                                           |
| `firstSeenBlock` | string \| null | Hash of the block where address was first seen                         |
| `firstSeenTx`    | string \| null | Hash of the transaction where address was first seen                   |
| `lastSeenBlock`  | string \| null | Hash of the block where address was last seen                          |
| `lastSeenTx`     | string \| null | Hash of the transaction where address was last seen                    |
| `txCount`        | string         | Total number of transactions involving this address (inputs + outputs) |
| `received`       | string         | Total value received in duffs                                          |
| `sent`           | string         | Total value sent in duffs                                              |
| `balance`        | string         | Current balance in duffs (`received - sent`)                           |

> Numeric stats are returned as strings to preserve precision for large values.

**Response `404`** — `"Address not found"`

---

### GET /address/:address/transactions

Returns a paginated list of transactions (confirmed and pending) involving the given address — either as input sender or output recipient.

**Path Parameters**

| Parameter | Type   | Constraints                                | Description  |
|-----------|--------|--------------------------------------------|--------------|
| `address` | string | length 33–35, alphanumeric (`[0-9A-Za-z]`) | Dash address |

**Query Parameters:** [Pagination](#pagination-query-parameters)

**Response `200`**

```json
{
  "resultSet": [
    {
      "hash": "abcdef1234...",
      "type": "CLASSIC",
      "blockHeight": 100000,
      "blockHash": "000000000000abcd1234...",
      "timestamp": "2023-01-01T00:00:00.000Z",
      "amount": "100000000",
      "version": 3,
      "vIn": [...],
      "vOut": [...],
      "confirmations": 10,
      "instantLock": "0102375e...d571d32a0a",
      "chainLocked": true,
      "coinbaseAmount": null,
      "coinjoin": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42
  }
}
```

Entries use the [Transaction Object](#transaction-object) shape. `total` reflects the distinct count of transactions the address appears in. Pending transactions (no block) are included with `blockHeight`, `blockHash`, `timestamp`, and `confirmations` set to `null`.

---

### GET /address/:address/utxo

Returns a paginated list of unspent transaction outputs (UTXOs) for the given address, ordered by amount.

**Path Parameters**

| Parameter | Type   | Constraints                                | Description  |
|-----------|--------|--------------------------------------------|--------------|
| `address` | string | length 33–35, alphanumeric (`[0-9A-Za-z]`) | Dash address |

**Query Parameters:** [Pagination](#pagination-query-parameters). `order` sorts by UTXO amount (`asc`/`desc`).

**Response `200`**

```json
{
  "resultSet": [
    {
      "prevTxHash": "abcdef1234...",
      "vOutIndex": 0,
      "address": "XdAUmwtig27HBG6WfYyHAzP8n6XC9jESEw",
      "amount": "100000000",
      "sequence": null,
      "scriptSigASM": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 17
  }
}
```

Entries use the [VIn Object](#vin-object) shape. `prevTxHash` and `vOutIndex` identify the unspent output; `amount` is in duffs as a string. `sequence` and `scriptSigASM` are always `null` for UTXOs (they apply only to inputs that have spent the output).

---

### GET /addresses/rich-list

Returns a paginated rich-list view: addresses sorted by current UTXO balance, each annotated with the share of total chain supply they hold. Backed by a materialized view (`address_balances`) refreshed by the indexer every block, so values lag the chain tip by at most one block.

**Query Parameters:** [Pagination](#pagination-query-parameters). Use `order=desc` to get the largest holders first (the rich-list view).

**Response `200`**

```json
{
  "resultSet": [
    {
      "address": "XdAUmwtig27HBG6WfYyHAzP8n6XC9jESEw",
      "balance": "543210000000000",
      "concentration": "5.123456789012"
    },
    {
      "address": "XfooBar...",
      "balance": "100000000000",
      "concentration": "0.000943217650"
    },
    {
      "address": "others",
      "balance": "<remaining duffs>",
      "concentration": "<remaining percent>"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1234567
  }
}
```

#### Address Balance Object

| Field           | Type           | Description                                                                                          |
|-----------------|----------------|------------------------------------------------------------------------------------------------------|
| `address`       | string \| null | Dash address, or the literal `"others"` for the aggregate row (see below)                            |
| `balance`       | string \| null | UTXO balance in duffs (1 DASH = 10⁸ duffs)                                                           |
| `concentration` | string \| null | Share of total chain supply held by this address, in percent. Fixed-decimal string with 12 decimals. |

**The `"others"` row.** The last entry in `resultSet` is always a synthetic row with `address: "others"` representing every address *not* on the current page. Its `balance` is `chain_supply_in_duffs − sum(balances on this page)` and its `concentration` is the matching percentage. As a result, the page is constructed so that the displayed rows + `"others"` sum to 100% of supply. `pagination.limit` reflects the requested limit; under the hood the DAO is queried with `limit − 1` to leave room for the `"others"` row.

**Sources & freshness.**
- `address`/`balance` come from the `address_balances` materialized view (UTXO sums grouped by address). The indexer refreshes it `CONCURRENTLY` after every live block.
- `concentration` is computed against the chain's total UTXO supply returned by Dash Core's `gettxoutsetinfo` RPC. That call is expensive (full chainstate scan) so the API caches it for 30 minutes; concentration values can therefore lag the chain tip by up to that long.
- `pagination.total` is `pg_class.reltuples` for the matview — an approximate row count, not exact.

**Caveats.**
- These are *address*-level shares, not *holder*-level. HD wallets spread one user across many addresses (understates concentration); exchange omnibus addresses pool many users into one (overstates concentration).
- Because the supply denominator comes from RPC (which counts UTXOs that have no parseable address — OP_RETURN, multisig, etc.) and the matview filters those out, the per-address numerators slightly underrepresent total chain supply. The `"others"` row absorbs this gap, so the page still sums to 100%.

---

### GET /transactions/chart

Returns a time series of transaction counts over a configurable time range, with optional running total.

**Query Parameters**

| Parameter         | Type    | Default               | Constraints          | Description                                                                                                      |
|-------------------|---------|-----------------------|----------------------|------------------------------------------------------------------------------------------------------------------|
| `timestamp_start` | string  | 1 hour ago (ISO 8601) |                      | Start of the time range                                                                                          |
| `timestamp_end`   | string  | now (ISO 8601)        |                      | End of the time range                                                                                            |
| `intervals_count` | number  | auto                  | minimum: 2, max: 100 | Number of buckets. When omitted, interval is chosen automatically via `calculateInterval`                        |
| `running_total`   | boolean | `false`               |                      | When `true`, each bucket's `count` is the cumulative total from `timestamp_start` through the end of that bucket |

**Response `200`**

```json
[
  {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "data": { "count": 142 }
  },
  {
    "timestamp": "2024-01-01T01:00:00.000Z",
    "data": { "count": 98 }
  }
]
```

| Field        | Type   | Description                                                                         |
|--------------|--------|-------------------------------------------------------------------------------------|
| `timestamp`  | string | ISO 8601 start of the bucket                                                        |
| `data.count` | number | Number of transactions in the bucket, or cumulative total if `running_total=true`   |

> Buckets with zero transactions are included with `count: 0`.

**Response `400`**

```json
{ "message": "start timestamp cannot be more than end timestamp" }
```

---

### GET /search

Searches across blocks, transactions, masternodes, and addresses. Input type is detected automatically.

| Input pattern                            | Queried entities                                            |
|------------------------------------------|-------------------------------------------------------------|
| Pure integer                             | Block by height                                             |
| 64-char hex string                       | Block by hash, transaction by hash, masternode by proTxHash |
| Dash address (`X`, `y`, `7`, `8` prefix) | Address by address                                          |
| Anything else                            | Returns all nulls                                           |

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

### GET /price/:currency/chart

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

### GET /marketcap/:currency/chart

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

### GET /volume/:currency/chart

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

### GET /address/:address/balance/chart

Returns a time series of the address balance over a given time range, with one data point per interval bucket.

**Path Parameters**

| Parameter | Type   | Constraints                                | Description  |
|-----------|--------|--------------------------------------------|--------------|
| `address` | string | length 33–35, alphanumeric (`[0-9A-Za-z]`) | Dash address |

**Query Parameters**

| Parameter         | Type   | Default               | Constraints          | Description                                                                                                                                    |
|-------------------|--------|-----------------------|----------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| `timestamp_start` | string | 1 hour ago (ISO 8601) |                      | Start of the time range                                                                                                                        |
| `timestamp_end`   | string | now (ISO 8601)        |                      | End of the time range                                                                                                                          |
| `intervals_count` | number | auto                  | minimum: 2, max: 100 | Number of buckets to divide the range into. When omitted, interval is chosen automatically based on the range length using `calculateInterval` |

When `intervals_count` is provided, each bucket spans `ceil((end - start) / intervals_count)` seconds, expressed as an ISO 8601 duration. When omitted, `calculateInterval` picks a bucket size from the `Intervals` enum (PT5M … P1Y) such that the range fits in 4–12 buckets.

**Response `200`**

```json
[
  {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "data": { "balance": "75000000" }
  },
  {
    "timestamp": "2024-01-02T00:00:00.000Z",
    "data": { "balance": "50000000" }
  }
]
```

| Field          | Type   | Description                                                                                                                            |
|----------------|--------|----------------------------------------------------------------------------------------------------------------------------------------|
| `timestamp`    | string | ISO 8601 start of the bucket                                                                                                           |
| `data.balance` | string | Cumulative balance in duffs at the end of the bucket (`received - spent`). Includes the initial balance from before `timestamp_start`. |

> Balance values are returned as strings to preserve precision for large numbers.

**Response `400`**

```json
{ "message": "start and end must be set" }
```

```json
{ "message": "start timestamp cannot be more than end timestamp" }
```

---

### GET /transactions/mempool

Returns a list of pending transactions.

**Query Parameters:** [Pagination](#pagination-query-parameters)

**Response `200`**

```json
{
  "resultSet": [
    {
      "hash": "4b82593225c75ad9566fe2938291edc53afc3eb9e61ced51a47bb98264dc1cb4",
      "type": "CLASSIC",
      "blockHeight": null,
      "blockHash": null,
      "timestamp": null,
      "amount": null,
      "version": null,
      "size": null,
      "vIn": [
        {
          "prevTxHash": "prevtxhash...",
          "vOutIndex": 0,
          "address": "XdAUmwtig27HBG6WfYyHAzP8n6XC9jESEw",
          "amount": "100000",
          "sequence": null,
          "scriptSigASM": null
        }
      ],
      "vOut": [
        {
          "value": "100000000",
          "number": 0,
          "scriptPubKeyASM": "OP_DUP OP_HASH160 ...",
          "address": "XdAUmwtig27HBG6WfYyHAzP8n6XC9jESEw"
        }
      ],
      "confirmations": null,
      "instantLock": "0102375e39652fee756b...d571d32a0a",
      "chainLocked": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2
  }
}
```

---

### GET /governance/budget

Returns treasury stats for the next superblock: the budget from Dash Core RPC plus aggregate figures computed across currently pending proposals.

`nextSuperblockTime` is derived empirically from the spacing of the two most recent indexed superblocks: `lastSuperblock.timestamp + (lastSuperblock.timestamp - prevSuperblock.timestamp)`.

**Response `200`**

```json
{
  "totalBudget": 7353.51481616,
  "totalProposals": 12,
  "totalRequested": 8423.0,
  "enoughVotesTotal": 7611.0,
  "enoughVotesCount": 9,
  "enoughFundsTotal": 7337.0,
  "enoughFundsCount": 8,
  "remainingAllPass": -1069.48518384,
  "remainingEnoughVotes": -257.48518384
}
```

| Field                  | Type   | Description                                                                                                                                                                     |
|------------------------|--------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `totalBudget`          | number | Superblock budget in Dash for `nextsuperblock`, from `getsuperblockbudget` RPC                                                                                                  |
| `totalProposals`       | number | Number of pending proposals (see pending definition above)                                                                                                                      |
| `totalRequested`       | number | Sum of `paymentAmount` across all pending proposals                                                                                                                             |
| `enoughVotesCount`     | number | Count of pending proposals whose `absoluteYesCount >= governanceminquorum`                                                                                                      |
| `enoughVotesTotal`     | number | Sum of `paymentAmount` across the `enoughVotes` subset                                                                                                                          |
| `enoughFundsCount`     | number | Count of proposals that would actually be paid: vote-qualified proposals selected greedily (descending by `absoluteYesCount`) while the cumulative amount fits in `totalBudget` |
| `enoughFundsTotal`     | number | Sum of `paymentAmount` across the `enoughFunds` subset                                                                                                                          |
| `remainingAllPass`     | number | `totalBudget - totalRequested` (negative when proposals are oversubscribed)                                                                                                     |
| `remainingEnoughVotes` | number | `totalBudget - enoughVotesTotal` (negative when vote-passing proposals exceed budget)                                                                                           |

**Response `404`** — fewer than 2 superblocks have been indexed, so `nextSuperblockTime` cannot be computed

```json
{ "error": "Not enough superblocks indexed to compute next superblock time" }
```

**Response `500`** — Dash Core's `lastsuperblock` height is ahead of the indexer's latest indexed superblock (sync lag)

```json
{ "error": "Cannot find the last superblock in the database. Please wait if the sync progress is not at 100%." }
```

---

### GET /chain/stats

Returns blockchain metadata from Dash Core RPC, enriched with throughput metrics from the last 20 indexed blocks, network hash rate from the last 120 indexed blocks, and the current indexed mempool size.

**Response `200`**

```json
{
  "chain": "main",
  "sizeOnDisk": 12345678901,
  "difficulty": 123456.789,
  "blockTime": 154321,
  "transactionsPerSecond": 1.23,
  "transactionsPerMinute": 73.8,
  "latestHeight": 2100000,
  "hashRate": "2482447954304473",
  "mempoolSize": 5
}
```

#### ChainStats Object

| Field                   | Type           | Description                                                                                                  |
|-------------------------|----------------|--------------------------------------------------------------------------------------------------------------|
| `chain`                 | string \| null | Network name (e.g. `main`, `test`)                                                                           |
| `sizeOnDisk`            | number \| null | Size of the block storage on the Dash Core node in bytes                                                     |
| `difficulty`            | number \| null | Current mining difficulty                                                                                    |
| `blockTime`             | number \| null | Average time between blocks in milliseconds, over the last 20 indexed blocks                                 |
| `transactionsPerSecond` | number \| null | Average transactions per second over the last 20 indexed blocks                                              |
| `transactionsPerMinute` | number \| null | Average transactions per minute over the last 20 indexed blocks                                              |
| `latestHeight`          | number \| null | Height of the most recently indexed block                                                                    |
| `hashRate`              | string \| null | Estimated network hash rate in H/s over the last 120 indexed blocks. Returned as a string (may exceed JS safe-integer range) |
| `mempoolSize`           | number \| null | Number of pending (unconfirmed) transactions currently indexed (`block_height IS NULL`)                      |
