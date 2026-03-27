# Fyxvo

Fyxvo is a Solana infrastructure control plane for funded RPC access, project treasury management, request tracing, alerts, operator visibility, and developer self-service.

Current product state:
- Devnet private alpha is live
- Hosted frontend, API, gateway, and worker are deployed
- Wallet auth, project activation, SOL funding, API keys, analytics, alerts, assistant, and public trust surfaces are live
- Mainnet is not launched yet

## Live Surfaces

- App: `https://www.fyxvo.com`
- API: `https://api.fyxvo.com`
- Gateway: `https://rpc.fyxvo.com`
- Status: `https://status.fyxvo.com`
- Docs: `https://www.fyxvo.com/docs`
- Repository: `https://github.com/fyxvo/fyxvo-platform`

## What Fyxvo Does

Fyxvo is not a generic RPC node. It is a funded relay and operations layer built around project-level control.

Core capabilities:
- Wallet-based authentication
- Project activation on Solana devnet
- SOL-funded request credits
- Project-scoped API keys
- Standard and priority relay modes
- Request logs, analytics, alerts, and health scoring
- Team collaboration, notes, recipes, and operational tooling
- Assistant workflows grounded in real project state

## Architecture

The product is split into clear operational layers:

1. `apps/web`
   Next.js frontend for dashboard, projects, funding, analytics, alerts, playground, assistant, docs, and status.
2. `apps/api`
   Fastify control plane for auth, projects, API keys, analytics, alerts, assistant, admin views, and transaction preparation.
3. `apps/gateway`
   Fastify relay plane for Solana JSON RPC traffic, pricing, rate limits, project balance checks, and upstream routing.
4. `apps/worker`
   BullMQ background processing for rollups, digests, indexing, node health, reward snapshots, and alerting.
5. `programs/fyxvo`
   Anchor program for protocol state, treasury state, per-project funding state, operator registration, and reward accounting.
6. `packages/*`
   Shared config, database, SDK, and UI packages.

## Current On-Chain State

Current live devnet program:
- Program ID: `FQ5pyjBQvfadKPPxd66YXksgn8veYnjEw2R1g6aQnFaa`
- Protocol admin authority: `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem`
- Protocol config: `GCWgmpoS2booNCp5VNP6z9HdYmkXpoXpM3rPK8kziqKX`
- Treasury: `3JaVp2CsJASutTAzVAjNfXi4yAR5f8uH1zoXAgaSh3px`
- Operator registry: `Df3tPaGGietrQdqjX7FGkuYb1XF6o36Vat2q92BmioWC`

Important truth:
- The original live upgrade authority is not the admin authority
- A governed replacement devnet program has been staged under keys the team controls
- See [Governed Devnet Redeployment Plan](docs/governed-devnet-redeployment.md) and [Governed Devnet Staging Snapshot](docs/governed-devnet-staging.md)

## SDK Quick Start

Install the SDK:

```bash
npm install @fyxvo/sdk
# or
yarn add @fyxvo/sdk
# or
pnpm add @fyxvo/sdk
```

Example:

```ts
import { createFyxvoClient } from "@fyxvo/sdk";

const client = createFyxvoClient({
  baseUrl: "https://rpc.fyxvo.com",
  apiKey: process.env.FYXVO_API_KEY,
  timeoutMs: 10_000,
});

const health = await client.rpc({ id: 1, method: "getHealth" });

const latestBlockhash = await client.rpc({
  id: 2,
  method: "getLatestBlockhash",
  params: [{ commitment: "confirmed" }],
});
```

## Local Development

### Prerequisites

- Node `22+`
- pnpm `10.23.0+`
- PostgreSQL
- Redis
- Solana CLI `2.3.0`
- Anchor CLI `0.32.1`

### Bootstrapping

```bash
pnpm install --frozen-lockfile
pnpm --filter @fyxvo/database generate
pnpm --filter @fyxvo/database migrate:dev
pnpm --filter @fyxvo/database seed
```

Start the local stack:

```bash
pnpm dev:full
```

Local endpoints:
- Web: `http://localhost:3000`
- API health: `http://localhost:4000/health`
- API status: `http://localhost:4000/v1/status`
- Gateway health: `http://localhost:4100/health`

## Devnet Program Workflow

Create or reuse a Solana wallet:

```bash
solana-keygen new --outfile ~/.config/solana/id.json
solana config set --url https://api.devnet.solana.com
solana config set --keypair ~/.config/solana/id.json
solana airdrop 2
```

Build and deploy:

```bash
pnpm solana:program:build
pnpm solana:program:deploy:devnet
pnpm solana:protocol:init
pnpm solana:protocol:verify
pnpm solana:protocol:addresses
```

Run a live devnet flow:

```bash
pnpm solana:flow:devnet-live
```

## Operations And Deployment

Hosted deployment targets:
- Vercel for `apps/web`
- Railway for `apps/api`
- Railway for `apps/worker`
- Railway or another container host for `apps/gateway`

Useful commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm prod:verify
pnpm prod:smoke
```

Production docs:
- [Deployment Guide](docs/deployment.md)
- [Production Rollout Checklist](docs/production-rollout-checklist.md)
- [Operations Runbook](docs/operations-runbook.md)
- [Program Metadata Guide](docs/program-metadata.md)

## Mainnet Positioning

Fyxvo is not claiming public paid mainnet readiness yet.

The current honest path is:
1. Operate and harden devnet
2. Stage the governed replacement program
3. Validate treasury, governance, rollback, and operational drills
4. Move toward limited mainnet beta only after those gates are closed

See:
- [Mainnet Readiness](docs/mainnet-readiness.md)
- [Mainnet Checklist](docs/mainnet-checklist.md)
- [Authority Migration Guide](docs/authority-migration.md)

## Documentation Index

Product and architecture:
- [Protocol Design](docs/protocol-design.md)
- [Gateway Architecture](docs/gateway-architecture.md)
- [Security Model](docs/security-model.md)
- [Monitoring](docs/monitoring.md)
- [Team Operations](docs/team-operations.md)

Operational and launch docs:
- [Deployment Guide](docs/deployment.md)
- [Incident Response](docs/incident-response.md)
- [Support Guide](docs/support-guide.md)
- [Launch Readiness](docs/launch-readiness.md)
- [Private Alpha](docs/private-alpha.md)

Governance and treasury:
- [Authority Migration Guide](docs/authority-migration.md)
- [Treasury Operations](docs/treasury-operations.md)
- [Data Governance](docs/data-governance.md)
- [Governed Devnet Redeployment Plan](docs/governed-devnet-redeployment.md)
- [Governed Devnet Staging Snapshot](docs/governed-devnet-staging.md)

## Security

- Public security policy: [SECURITY.md](SECURITY.md)
- Public security page: `https://www.fyxvo.com/security`
- Public security.txt: `https://www.fyxvo.com/.well-known/security.txt`

If you need explorer-facing canonical metadata for the staged governed program, use the steps in [Program Metadata Guide](docs/program-metadata.md).
