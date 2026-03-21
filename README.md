# Fyxvo

Current milestone: `0.1.0` devnet private alpha.

## 1. What Fyxvo Is

Fyxvo is a Solana infrastructure control plane for funded JSON RPC access, project treasury management, operator rewards, and developer self-service.

Today the repository implements six production-facing layers:

1. A Next.js App Router frontend in `apps/web` for wallet sign-in, project operations, API key management, funding flows, analytics, operator views, documentation, and service status.
2. A Fastify API in `apps/api` for wallet authentication, project CRUD, API key lifecycle, analytics queries, admin views, and unsigned transaction preparation.
3. A Fastify gateway in `apps/gateway` that accepts Solana JSON RPC traffic, authenticates API keys, checks project balances against on-chain project accounts, applies Redis-backed rate limits, and routes requests across multiple upstream Solana nodes with fallback.
4. A BullMQ worker in `apps/worker` that aggregates request logs, indexes wallet and token activity, monitors node health, and computes operator reward snapshots.
5. An Anchor program in `programs/fyxvo` that owns protocol state for treasury balances, per-project balances, operator registration, reward accrual, and reward claims.
6. Shared packages in `packages/*` for configuration, Prisma data access, UI components, and the public TypeScript SDK.

Fyxvo is not a general RPC node. It is a funded relay layer and operator coordination system built around Solana devnet first, with deployed program ID `FQ5pyjBQvfadKPPxd66YXksgn8veYnjEw2R1g6aQnFaa`, admin authority `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem`, protocol config `GCWgmpoS2booNCp5VNP6z9HdYmkXpoXpM3rPK8kziqKX`, treasury `3JaVp2CsJASutTAzVAjNfXi4yAR5f8uH1zoXAgaSh3px`, operator registry `Df3tPaGGietrQdqjX7FGkuYb1XF6o36Vat2q92BmioWC`, and the devnet USDC mint `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`.

The fastest first-user path is:

1. Connect a supported Solana wallet.
2. Create and activate one project.
3. Fund it with SOL on devnet.
4. Generate one relay key.
5. Send one request to `/rpc`.
6. Watch analytics and status update from live data.

## Getting Started (SDK)

Install the Fyxvo SDK:

```bash
npm install @fyxvo/sdk
```

Then create a client and send your first request:

```ts
import { createFyxvoClient } from "@fyxvo/sdk";

const client = createFyxvoClient({
  baseUrl: "https://rpc.fyxvo.com",
  apiKey: process.env.FYXVO_API_KEY,
});

// Standard RPC request
const health = await client.rpc({ id: 1, method: "getHealth" });

// Fetch the latest blockhash
const blockhash = await client.rpc({
  id: 2,
  method: "getLatestBlockhash",
  params: [{ commitment: "confirmed" }],
});
```

Full documentation is available at [fyxvo.com/docs](https://fyxvo.com/docs).

## 2. Architecture

Fyxvo is organized as a pnpm monorepo and uses a split architecture where the user-facing product, control plane, relay plane, and on-chain settlement layer are separate processes.

1. `apps/web` runs on port `3000` in development and talks to the API and gateway through public base URLs.
2. `apps/api` runs on port `4000` and is the control plane. It stores users, projects, API keys, request logs, idempotency records, funding preparations, node operators, nodes, metrics, wallet activity, token balances, transaction lookups, and reward snapshots in PostgreSQL through Prisma.
3. `apps/gateway` runs on port `4100` and is the data plane. It is intentionally narrow: it accepts JSON RPC, looks up the caller’s project by API key, applies Redis rate limiting, checks project funds from the on-chain `ProjectAccount`, prices the request, selects an upstream node, and records request outcomes.
4. `apps/worker` has no public HTTP surface. It uses Redis queues and PostgreSQL to keep analytics, indexing, node health, and reward snapshots current.
5. `packages/database` defines the durable operational model. The core tables are `User`, `Project`, `ApiKey`, `RequestLog`, `NodeOperator`, `Node`, and `Metrics`, with additional tables for `FundingCoordinate`, `IdempotencyRecord`, `WorkerCursor`, `ProjectUsageRollup`, `WalletActivity`, `WalletTokenBalance`, `TransactionLookup`, `NodeHealthCheck`, and `OperatorRewardSnapshot`.
6. `programs/fyxvo` is the settlement layer. It owns the protocol config, treasury balances, per-project balances, operator registration, reward accrual, and reward claiming.

The frontend and API expose the product. The gateway enforces spend. The worker explains what happened. The Anchor program is the source of truth for balances and claims.

## 3. Hybrid Model

Fyxvo is deliberately hybrid. Not every piece of state belongs on chain, and not every control should stay off chain.

1. On chain, Fyxvo stores treasury state, per-project balances, operator registration, reward accrual, claimed amounts, protocol fee accounting, and the protocol pause flag.
2. Off chain, Fyxvo stores human-oriented and operational data such as project names, slugs, descriptions, wallet sessions, API keys, request logs, analytics rollups, node metadata, node health history, wallet activity, token balances, and reward snapshots.
3. The API bridges those layers by deriving PDAs from stored project ownership and `chainProjectId`, then preparing unsigned transactions for the browser instead of taking custody of a signer.
4. The gateway bridges those layers by charging requests against Redis spend counters, but using the on-chain `ProjectAccount` as the backing balance source. This keeps metering fast while still anchoring the available balance to program state.
5. The worker bridges those layers by converting raw traffic and node observations into hourly usage rollups, indexed wallet history, node reputation, and reward snapshots. Those snapshots are informational until a project owner or protocol flow turns them into on-chain `accrue_reward` instructions.

This split is the core Fyxvo model: money and claims are on chain, operations and coordination are off chain, and the API and gateway keep the two in sync.

## 4. Setup in Codespaces

The repository is designed to boot inside GitHub Codespaces without a manual toolchain hunt.

1. Open the repository in Codespaces.
2. Let the devcontainer finish its `postCreateCommand`. The devcontainer runs `bash ./.devcontainer/post-create.sh`, which loads the Node feature environment before calling `scripts/bootstrap.sh`.
3. The bootstrap script installs Node LTS, pnpm `10.23.0`, Rust stable, Solana CLI `2.3.0`, Anchor CLI `0.32.1`, PostgreSQL client tools, Redis tools, and workspace dependencies.
4. The devcontainer forwards ports `3000`, `4000`, `4100`, `5432`, and `6379`.
5. The resulting workspace already contains the PATH wiring for Cargo, Solana, and Anchor binaries.

The devcontainer file is [`.devcontainer/devcontainer.json`](.devcontainer/devcontainer.json), the post-create wrapper is [`.devcontainer/post-create.sh`](.devcontainer/post-create.sh), and the bootstrap script is [`scripts/bootstrap.sh`](scripts/bootstrap.sh).

## 5. Devnet Setup

The product targets Solana devnet. The web app, API, gateway, and worker all default to devnet in the shared config package.

1. Create or reuse a Solana keypair.

```bash
solana-keygen new --outfile ~/.config/solana/id.json
```

2. Point the CLI at devnet.

```bash
solana config set --url https://api.devnet.solana.com
solana config set --keypair ~/.config/solana/id.json
```

3. Fund the wallet you will use as the deployer or project owner.

```bash
solana airdrop 2
```

4. Build and sync the Anchor program ID before deployment.

```bash
pnpm solana:program:build
```

5. Deploy the program to devnet.

```bash
pnpm solana:program:deploy:devnet
```

6. Initialize or reuse the protocol PDAs on devnet.

```bash
pnpm solana:protocol:init
```

7. Verify readiness from the same derived addresses the API and gateway use.

```bash
pnpm solana:protocol:verify
pnpm solana:protocol:addresses
```

8. Seed the managed launch operator after a project is activated.

```bash
pnpm solana:operator:seed:managed --project-owner <wallet> --chain-project-id <number>
```

9. Run the full live SOL path against the local stack when you want a fresh end-to-end verification.

```bash
pnpm solana:flow:devnet-live
```

10. Keep in mind that the application stack targets devnet, while `anchor test` uses localnet. That split is intentional. Devnet is for integration behavior, and localnet is for deterministic contract tests.
11. SOL funding is live by default. USDC stays configuration-gated until `FYXVO_ENABLE_USDC=true` and the derived treasury vault is present on devnet. The mint already wired into the config package is:

```text
4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

12. The current devnet launch state includes one managed operator registration. The managed operator wallet is `8TZ1Q5TqNmbDkza57ZssfmufMxX8hxoKV28uhWg4Qnph`, with operator account `5DnhYryvZAKWLY6kuzQKYrUdNBCskQ3oZgnrMmj6Fwi6` and reward account `HM3HHtkJDY4gYzeixSfEQp2Hk7VrE8mQoouNhM7q3TEG`.
13. If the faucet is rate limited, the deploy command prints the exact wallet to fund and the exact rerun command. The deployer wallet is `GwBiHc2bFjx5r19MNbnGve5BM1PjoxJ7WXXQHrndPTzr`.
14. If you need to verify the current program ID from code, check [`packages/config/src/solana.ts`](packages/config/src/solana.ts).

## 6. Phantom Usage

The frontend uses Phantom for wallet proof and transaction submission. Fyxvo does not store private keys.

1. The frontend opens Phantom through `@phantom/browser-sdk` with the injected provider.
2. On connect, the browser asks Phantom for the current Solana public key.
3. The frontend attempts to switch Phantom to devnet. If that switch fails, the UI marks the wallet as a network mismatch and keeps the warning visible.
4. The frontend requests `/v1/auth/challenge` from the API. The API creates or refreshes the user row, stores a new nonce, and returns a message of the form:

```text
Fyxvo Authentication
Wallet: <wallet>
Nonce: <nonce>
By signing this message you prove wallet ownership and start a JWT-backed session.
No private keys are ever transmitted to or stored by Fyxvo.
```

5. Phantom signs the message locally.
6. The frontend submits the signature to `/v1/auth/verify`.
7. The API verifies the detached Ed25519 signature against the wallet public key, rotates the nonce, and returns a JWT-backed session.
8. Funding uses the same wallet session. The API prepares an unsigned VersionedTransaction, the browser gives that payload to Phantom, and Phantom signs and sends it.

The wallet implementation lives in [`apps/web/lib/phantom.ts`](apps/web/lib/phantom.ts). The API-side verification logic lives in [`apps/api/src/app.ts`](apps/api/src/app.ts).

## 7. Running Locally

Fyxvo expects PostgreSQL, Redis, and the monorepo dependencies to be available.

1. Copy the root environment file and the app-specific examples you want to override.

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/gateway/.env.example apps/gateway/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/worker/.env.example apps/worker/.env
```

2. Start PostgreSQL and Redis. If you want disposable local dependencies, this is enough:

```bash
docker run --name fyxvo-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fyxvo -p 5432:5432 -d postgres:16
docker run --name fyxvo-redis -p 6379:6379 -d redis:7
```

3. Install dependencies if bootstrap has not already done it.

```bash
pnpm install --frozen-lockfile
```

4. Generate Prisma artifacts, apply migrations, and seed the database.

```bash
pnpm --filter @fyxvo/database generate
pnpm --filter @fyxvo/database migrate:dev
pnpm --filter @fyxvo/database seed
```

5. Start the full local stack with dependency orchestration.

```bash
pnpm dev:full
```

6. Open the product at `http://localhost:3000`.
7. The API health endpoint is `http://localhost:4000/health`.
8. The gateway health endpoint is `http://localhost:4100/health`.
9. The API status endpoint is `http://localhost:4000/v1/status`.

If you only want one service, use the package-level commands. `pnpm --filter @fyxvo/api dev`, `pnpm --filter @fyxvo/gateway dev`, `pnpm --filter @fyxvo/worker dev`, and `pnpm --filter @fyxvo/web dev` all work independently.

## 8. Deployment

Fyxvo is prepared for manual deployment. Nothing in this repository auto-deploys on push.

1. The frontend is prepared for Vercel with [`apps/web/vercel.json`](apps/web/vercel.json), App Router metadata, security headers, sitemap generation, and icons sourced from the repository logo files.
2. The API is prepared for Railway with [`apps/api/railway.json`](apps/api/railway.json), strict production env validation, hosted CORS control, and health and status surfaces for `api.fyxvo.com`.
3. The worker is prepared for Railway with [`apps/worker/railway.json`](apps/worker/railway.json) and production env validation against PostgreSQL and Redis.
4. The gateway is prepared as a container with [`apps/gateway/Dockerfile`](apps/gateway/Dockerfile), hosted CORS and security headers, and Railway-ready health, status, and metrics endpoints for `rpc.fyxvo.com`.
5. The status page remains part of the frontend and can be attached to `status.fyxvo.com` by setting `NEXT_PUBLIC_STATUS_PAGE_URL` without changing application code.
6. Local, hosted devnet, and future mainnet planning env sets live beside each deployable app as `.env.example`, `.env.devnet-hosted.example`, and `.env.mainnet.example`.
7. The complete manual deployment, DNS, and cutover runbook is in [`docs/deployment.md`](docs/deployment.md).

## 9. Detailed Docs

The repository now includes focused documentation for the major subsystems.

1. [`docs/protocol-design.md`](docs/protocol-design.md)
2. [`docs/gateway-architecture.md`](docs/gateway-architecture.md)
3. [`docs/indexing-system.md`](docs/indexing-system.md)
4. [`docs/security-model.md`](docs/security-model.md)
5. [`docs/deployment.md`](docs/deployment.md)
6. [`docs/mainnet-checklist.md`](docs/mainnet-checklist.md)
7. [`docs/monitoring.md`](docs/monitoring.md)
8. [`docs/team-operations.md`](docs/team-operations.md)
9. [`docs/mainnet-readiness.md`](docs/mainnet-readiness.md)
10. [`docs/authority-migration.md`](docs/authority-migration.md)
11. [`docs/treasury-operations.md`](docs/treasury-operations.md)
12. [`docs/operations-runbook.md`](docs/operations-runbook.md)
13. [`docs/data-governance.md`](docs/data-governance.md)
14. [`docs/private-alpha.md`](docs/private-alpha.md)
15. [`docs/support-guide.md`](docs/support-guide.md)
