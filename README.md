# Dashscan

A block explorer for the Dash network. Dashscan indexes the Dash blockchain into a PostgreSQL database and exposes it through a REST API and a web frontend.

## Architecture

| Component | Stack | Purpose |
|-----------|-------|---------|
| `indexer/` | Rust (Tokio, tokio-postgres) | Syncs blocks from Dash Core via JSON-RPC and ZMQ |
| `api/` | TypeScript (Fastify, Knex) | REST API backed by PostgreSQL |
| `frontend/` | React (TanStack Router/Query, Tailwind) | Web UI |

## Features

- Block and transaction browsing
- Address balances and transaction history
- Masternode list and detail pages
- Special transactions (coinbase, superblocks, etc.)
- UTXO tracking
- DAO governance page
- Prometheus metrics (via API)

## Prerequisites

- Rust (2024 edition)
- Node.js 18+
- PostgreSQL 14+
- A running Dash Core node with RPC and ZMQ enabled

## Setup

### 1. Database

Create a PostgreSQL database:

```sql
CREATE USER dashscan WITH PASSWORD 'dashscan';
CREATE DATABASE dashscan OWNER dashscan;
```

Migrations are applied automatically by the indexer on startup (Refinery).

### 2. Indexer

```bash
cd indexer
cp .env.example .env   # edit with your values
cargo run --release
```

`.env` variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `CORE_RPC_HOST` / `CORE_RPC_PORT` | Dash Core RPC address |
| `CORE_RPC_USER` / `CORE_RPC_PASSWORD` | Dash Core RPC credentials |
| `CORE_ZMQ_URL` | ZMQ endpoint for new-block notifications |
| `NETWORK` | `mainnet` or `testnet` |
| `START_HEIGHT` | Block height to begin indexing from |

### 3. API

```bash
cd api
npm install
cp .env.example .env   # edit with your values
npm start
```

`.env` variables: `DATABASE_URL`, `CORE_RPC_*`, `CORE_ZMQ_URL`, `NETWORK`.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev        # development (port 3000)
npm run build      # production build
```

## Docker

Each component has a `Dockerfile`. Compose support can be added by wiring the three services to a shared PostgreSQL instance.

## License

MIT