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

For a Docker Compose deployment, only Docker is needed — skip to
[Deploying with Docker Compose](#deploying-with-docker-compose).

To run the components directly:

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

Migrations (Refinery) are applied by the indexer's `migrate` subcommand, which
exits when finished — a normal indexer start does not apply them:

```bash
cd indexer
cargo run --release -- migrate
```

Under Docker Compose this runs automatically as the one-shot `migrate` service,
which the `indexer` and `api` services wait on before starting.

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
| `CORE_P2P_HOST` / `CORE_P2P_PORT` | Dash Core P2P address (block catch-up + peer crawler seed) |
| `REDIS_URL` | Redis connection string (governance + peer caches) |
| `NETWORK` | `mainnet` or `testnet` |
| `START_HEIGHT` | Block height to begin indexing from |
| `PEER_CRAWL_EVERY_BLOCKS` | Run a peer crawl every N live-sync blocks (default `25`; `0` disables) |
| `PEER_CRAWL_MAX_PEERS` | Safety cap on addresses visited per crawl round (default `100000`) |
| `PEER_CRAWL_CONCURRENCY` | Concurrent peer connections per crawl (default `512`) |
| `PEER_CRAWL_DEADLINE_SECS` | Wall-clock ceiling for one crawl round (default `600`) |
| `PEER_CRAWL_CONNECT_TIMEOUT_SECS` | Per-peer connect/handshake timeout (default `3`) |

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

## Deploying with Docker Compose

`docker-compose.yml` in the repo root runs the whole stack. Only Docker is
required — the Rust/Node/PostgreSQL prerequisites above are for local development.

Verified with Docker Compose v5.4.0. Requires a version supporting
`depends_on[].required` and `service_completed_successfully`.

### Quick start (local)

```bash
cp .env.example .env     # then edit it — see below
docker compose up -d --build
docker compose logs -f
```

The first run builds the images locally; the indexer is a Rust release build and
takes several minutes.

### Deploying a released version

`api`, `indexer` and `migrate` run published images from GHCR rather than
building on the server. Pin the release in `.env`:

```bash
VERSION=0.4.8            # git tag pushed by .github/workflows/publish.yml
```

Then on the server:

```bash
docker compose pull
docker compose up -d --no-build
```

`--no-build` matters: `api` and `indexer` also carry a `build:` section for
local development, so without it a failed or skipped pull silently falls back to
building from source on the server.

Rolling back is the same flow with an earlier `VERSION` — but note that
migrations are not reversible, so an older image may not match a newer schema.

Image names are derived from the CI naming and can be overridden:

| Variable | Default | Resulting reference |
|----------|---------|---------------------|
| `VERSION` | `nightly` | tag — a git tag (`0.4.8`) or `nightly` from develop merges |
| `REGISTRY` | `ghcr.io` | `ghcr.io/pshenmic/dashscan-api:0.4.8` |
| `IMAGE_PREFIX` | `pshenmic/dashscan` | `ghcr.io/pshenmic/dashscan-indexer:0.4.8` |

`migrate` intentionally uses the **same image and tag as the indexer**, so the
schema always matches the binary that runs against it.

Two caveats:

- **Published images are `linux/amd64` only.** They run on a typical x86 server,
  but pulling on Apple Silicon fails with `no matching manifest for
  linux/arm64/v8`. Build locally instead, or add multi-arch (`platforms:`) to the
  publish workflow.
- **CI does not publish a frontend image** — `publish.yml` has jobs for api and
  indexer only. The frontend is built locally from `frontend/Dockerfile`, which
  is also why `VERSION` doesn't apply to it. Because `DASHSCAN_API_URL` is baked
  into the bundle at build time, a published frontend image would have to be
  built per environment rather than pulled by version.

### Services

| Service | Profile | Notes |
|---------|---------|-------|
| `migrate` | always | One-shot; applies Refinery migrations, then exits |
| `indexer` | always | Waits for `migrate` to exit 0 |
| `api` | always | Runs `API_REPLICAS` replicas (default 4); no published port of its own |
| `haproxy` | always | Load balances the api replicas; publishes `API_PORT` |
| `postgres` | `local-db` | |
| `redis` | `local-redis` | |
| `dashd` | `local-dashcore` | Dash Core node; mainnet needs ~40GB disk |
| `frontend` | `local-frontend` | Publishes `FRONTEND_PORT` |

Infrastructure is opt-in via profiles, so the same file serves both a
self-contained dev box and a production host that uses managed Postgres/Redis
and an existing Dash Core node.

Set profiles once in `.env` rather than passing flags every time:

```bash
# Production: external DB, Redis and Core; frontend served elsewhere
# COMPOSE_PROFILES=

# Everything local
COMPOSE_PROFILES=local-db,local-redis,local-dashcore,local-frontend
```

Anything omitted must be reachable at the URL you configure — `DATABASE_URL`,
`REDIS_URL` and the `CORE_*` variables. For a service running on the Docker
host itself, use `host.docker.internal` (already mapped for `api` and `indexer`).

### Configuration

`.env` next to `docker-compose.yml`. `DATABASE_URL` and `REDIS_URL` are
required and fail fast if missing; `.env.example` documents every value.

| Variable | Description |
|----------|-------------|
| `VERSION` | Published image tag for api/indexer/migrate (default `nightly`) |
| `REGISTRY` / `IMAGE_PREFIX` | Override where images are pulled from |
| `COMPOSE_PROFILES` | Which optional services to run (see above) |
| `DATABASE_URL` | Required. Host `postgres` with the `local-db` profile |
| `REDIS_URL` | Required. Host `redis` with the `local-redis` profile |
| `NETWORK` | `mainnet` or `testnet` |
| `CORE_RPC_*`, `CORE_ZMQ_URL`, `CORE_P2P_*` | Dash Core connection |
| `CORE_CHAIN` | `local-dashcore` only — `main`/`test`/`regtest`; must agree with `NETWORK` |
| `POSTGRES_USER` / `_PASSWORD` / `_DB` | `local-db` only; must agree with `DATABASE_URL` |
| `API_PORT` | Host port published by haproxy (default `3005`) |
| `API_REPLICAS` | Number of api containers (default `4`) |
| `FRONTEND_PORT` | Host port for the frontend (default `3000`) |
| `DASHSCAN_API_URL` | **Build-time.** See below |

`DASHSCAN_API_URL` is inlined into the frontend bundle at build time, so it must
be the URL a **browser** can reach — not an in-network name like
`http://api:3005`. Changing it requires a rebuild, not just a restart:

```bash
docker compose build frontend && docker compose up -d frontend
```

### Using the bundled Dash Core node

The `local-dashcore` profile runs `dashpay/dashd`. Its RPC port is deliberately
not published to the host (`-rpcallowip` is open, so it stays on the compose
network); only the P2P port is. Initial mainnet sync takes a long time and the
API returns `503 {"status":"syncing"}` until the indexer catches up.

When pointing at your **own** node instead, it needs `server=1`, matching RPC
credentials, and these ZMQ publishers, which the indexer subscribes to:

```
zmqpubhashblock, zmqpubrawtx, zmqpubrawtxlock,
zmqpubrawtxlocksig, zmqpubrawchainlocksig
```

### Scaling the API

`haproxy` discovers api replicas through Docker DNS, so scaling needs no
restart or config change:

```bash
docker compose up -d --scale api=6 api
```

The haproxy config is inlined in `docker-compose.yml` under the top-level
`configs:` key, so a deploy host needs no file besides `docker-compose.yml` and
`.env`. It pre-allocates 8 backend slots (`server-template api 8`);
raise that line before going beyond 8. There are no health checks — every
replica stays in rotation and its response (including `503` while syncing) is
passed through. A cleanly stopped container is dropped from DNS automatically,
but a hung one keeps receiving its share of traffic.

The stats UI is on port 8404, unpublished. To view it:

```bash
docker compose exec haproxy wget -qO- http://127.0.0.1:8404/
```

### Migrations

The `migrate` service runs before `indexer` and `api` on every `up`, and is a
no-op once the schema is current. To run it by hand:

```bash
docker compose run --rm migrate
```

### Operations

```bash
docker compose ps                      # status
docker compose logs -f indexer         # follow one service
docker compose pull && docker compose up -d --no-build  # deploy pinned VERSION
docker compose down                    # stop, keep data
docker compose down -v                 # stop and DELETE all volumes
```

`down -v` destroys the Postgres, Redis and Dash Core volumes, including the
indexed chain.

### Before exposing this publicly

- **No TLS.** haproxy serves plain HTTP on `API_PORT`, and the frontend on
  `FRONTEND_PORT`. Terminate TLS in haproxy or put a reverse proxy in front.
- Replace every `change-me` credential in `.env`.
- Only publish the ports you actually need.

## License

MIT