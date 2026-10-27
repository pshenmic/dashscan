<div align="center">

# Dashscan Web App

**Blockchain explorer for the [Dash](https://www.dash.org/) network**

Browse blocks, transactions, masternodes, wallet addresses.

---

`React` `TypeScript` `TanStack Start` `Tailwind CSS` `Shadcn` `Vite`

</div>

## Getting Started

**Prerequisites:** Node.js 24 LTS and npm 11. The Node version is recorded in
`.nvmrc`; if you use nvm, run `nvm install` and `nvm use` from this directory.

The frontend can use the public testnet API without a local database, Dash Core,
API server, or indexer:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Dev server runs at **http://localhost:3000**

If port 3000 is occupied, use `npm run dev -- --port 3001 --strictPort`.
Stop the server with Ctrl+C.

Use npm for this package and commit `package-lock.json` when dependencies change.
Do not generate Yarn/pnpm lockfiles or use `--legacy-peer-deps` / `--force` to
bypass dependency conflicts. The repository's API still uses its own Yarn setup.

## Environment

| Variable | Default/example | Purpose |
| --- | --- | --- |
| `DASHSCAN_API_URL` | `https://testnet.dashscan.pshenmic.dev` | API URL accessible from both the browser and the SSR server |
| `NETWORK` | `testnet` | Network label/query keys: `testnet` or `mainnet` |

Vite loads `.env`, `.env.local`, and mode-specific env files. Shell environment
variables take precedence. Only these two values are explicitly exposed to the
frontend; never put credentials in them. They are embedded at build time, so
restart development after editing env files and rebuild production when changing
the API or network. `NETWORK` does not select an API endpoint automatically:
configure the matching `DASHSCAN_API_URL` too.

For a local API, set `DASHSCAN_API_URL=http://localhost:3005` and match `NETWORK`
to your backend. Loading live data depends on that API being available.

## Scripts

```bash
npm run dev
npm run typecheck
npm test
npm run check
npm run lint
npm run format -- --write
npm run build
npm start
```

`check` reports lint, formatting and import-order problems without changing files.
`npm run check -- --write` applies safe fixes. CSS is intentionally excluded from
the existing Biome scope. `typecheck` is separate from Vite's build and must also
pass before merging. Tests run in Node, without a live API.

`npm start` serves the Nitro output from a preceding `npm run build` (port 3000
by default; override with `PORT`). `npm run preview` previews a build via Vite.

## Dependencies and UI

There are two themes, `neo` (default) and `dash`, sharing routes and API queries.
Check both when changing shared components or state. Map changes also require
checking the masternode and peer maps, zoom/pan, country hover and markers.

The framework packages are pinned to a known-compatible TanStack Start/Router
pair. Upgrade them together rather than independently. The scoped
`postcss-selector-parser` override patches Typography's pinned parser while
staying on its compatible major; remove it once Typography updates that pin.

The identicon avatar uses `minidenticons` directly, preserving its previous
rendering without pulling a React Native dependency chain into this web package.

For dependency maintenance, run `npm outdated`, `npm audit`, and `npm ls --all`.
Do not apply `npm audit fix --force` without reviewing version/API changes.

## Docker

From the repository root:

```bash
docker build -t dashscan-frontend \
  --build-arg DASHSCAN_API_URL=https://testnet.dashscan.pshenmic.dev \
  --build-arg NETWORK=testnet frontend
docker run --rm -p 3000:3000 dashscan-frontend
```

The API URL must be browser-accessible, not a Docker-only hostname. The root
Compose `local-frontend` profile also builds this Dockerfile, but starts the
backend stack; it is not needed for frontend-only work.
