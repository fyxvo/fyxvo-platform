# Deployment Guide

## 1. Deployment Topology

Fyxvo deploys as four independent services.

1. `apps/web` goes to Vercel.
2. `apps/api` goes to Railway.
3. `apps/worker` goes to Railway.
4. `apps/gateway` builds into a container image and can run anywhere that can host a Node container. Railway is supported through the Dockerfile path setting, but the image is not Railway-specific.

This repository does not auto-deploy. The configuration files only prepare each target for manual rollout.

The deployment flow is intentionally split into two tracks:

1. Devnet protocol activation for the Anchor program and protocol PDAs.
2. Service deployment for the frontend, API, worker, and gateway.

The devnet protocol is now live with these fixed addresses:

1. Program ID `Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc`
2. Protocol config `J4uiLhB3qaYUFvu6YAT6oTrBbe7qXfwZFfLm2ph5GTAH`
3. Treasury `HvgY6dGviH5xosaHvVBNKwt2gTTnJYJ9aG7dWC4wqST1`
4. Operator registry `9k4Xr4qfVMSN14aNkFdDFHbd74syujkyYcGKGTWYxmRQ`
5. Treasury USDC vault `2epkxnyGfX6FPYRmPa2tystcd1UrvjYFR5wJh6uKZj5i`

## 2. Frontend on Vercel

The frontend configuration file is [`apps/web/vercel.json`](../apps/web/vercel.json). The Next.js app also now carries production metadata, canonical URL support, robots behavior, a sitemap, icon assets sourced from the repository logo files, and public security headers through [`apps/web/next.config.ts`](../apps/web/next.config.ts) and the App Router metadata files.

Manual Vercel setup is:

1. Open the existing Vercel team `Fyxvo's projects`.
2. Import this repository into that team.
3. Set the project Root Directory to `apps/web`.
4. Keep the framework preset as Next.js.
5. Enable monorepo access outside the root directory because the app imports shared workspace packages.
6. Load environment values from [`apps/web/.env.devnet-hosted.example`](../apps/web/.env.devnet-hosted.example).
7. Set `NEXT_PUBLIC_SITE_URL=https://www.fyxvo.com`.
8. Set `NEXT_PUBLIC_STATUS_PAGE_URL=https://status.fyxvo.com`.
9. Set `NEXT_PUBLIC_API_BASE_URL=https://api.fyxvo.com`.
10. Set `NEXT_PUBLIC_GATEWAY_BASE_URL=https://rpc.fyxvo.com`.
11. Keep `NEXT_PUBLIC_SOLANA_CLUSTER=devnet`.
12. Keep `NEXT_PUBLIC_ENABLE_USDC=false` unless you intentionally want the gated token path visible.
13. Keep `NEXT_PUBLIC_ALLOW_INDEXING=false` while the public deployment is still devnet-only.
14. Deploy once without custom domains and verify `/`, `/dashboard`, `/docs`, and `/status`.
15. Attach `www.fyxvo.com` as the primary production domain.
16. Attach `status.fyxvo.com` to the same project. The frontend middleware rewrites that host to `/status`.
17. Add `fyxvo.com` to the same project and configure a redirect to `https://www.fyxvo.com`. The frontend middleware also preserves that redirect behavior if the apex host reaches the app directly.

The frontend treats `www.fyxvo.com` as the primary canonical origin. Status can live on the same deployment under `status.fyxvo.com` without code changes because the status page canonical URL is now env-driven.

## 3. API on Railway

The API manifest is [`apps/api/railway.json`](../apps/api/railway.json).

It does four important things:

1. Builds `@fyxvo/config`, `@fyxvo/database`, and `@fyxvo/api`.
2. Runs Prisma migrations before the new deployment becomes active.
3. Starts the compiled server with `pnpm --filter @fyxvo/api start`.
4. Uses `/health` as the platform health check.

Manual Railway setup is:

1. Create a Railway service from this repository for the API.
2. Point the service at `apps/api`.
3. Attach PostgreSQL and Redis to the same Railway project.
4. Load environment values from [`apps/api/.env.devnet-hosted.example`](../apps/api/.env.devnet-hosted.example).
5. Replace `DATABASE_URL`, `REDIS_URL`, and `API_JWT_SECRET` with real hosted values.
6. Keep `WEB_ORIGIN=https://www.fyxvo.com`.
7. Keep `CORS_ALLOWED_ORIGINS=https://www.fyxvo.com,https://status.fyxvo.com`.
8. Keep the live program ID and admin authority values already in the env example.
9. Deploy and verify `GET /health`.
10. Verify `GET /v1/status` returns `protocolReadiness.ready=true`.
11. Attach `api.fyxvo.com` only after both checks pass.

The API honors `PORT` first and falls back to `API_PORT`.

## 4. Worker on Railway

The worker manifest is [`apps/worker/railway.json`](../apps/worker/railway.json).

It does three important things:

1. Builds `@fyxvo/config`, `@fyxvo/database`, and `@fyxvo/worker`.
2. Starts the compiled BullMQ runtime with `pnpm --filter @fyxvo/worker start`.
3. Uses an on-failure restart policy so queue processing resumes automatically.

Manual Railway setup is:

1. Create a second Railway service from the same repository for the worker.
2. Point the service at `apps/worker`.
3. Reuse the same PostgreSQL and Redis instances as the API.
4. Load environment values from [`apps/worker/.env.devnet-hosted.example`](../apps/worker/.env.devnet-hosted.example).
5. Replace `DATABASE_URL` and `REDIS_URL` with the real hosted values.
6. Keep the live devnet program and authority values unchanged.
7. Deploy and confirm the logs show recurring BullMQ activity, request-log aggregation, and no Redis or PostgreSQL startup failures.
8. After deploy, confirm `GET /v1/admin/overview` from an admin session reports `worker.status=healthy`.

The worker does not expose a public HTTP endpoint. Its health is operationally visible through process logs, queue activity, database writes, and downstream status changes.

## 5. Gateway Container

The gateway image is defined by [`apps/gateway/Dockerfile`](../apps/gateway/Dockerfile).

The image:

1. Uses a multi-stage Node 22 build.
2. Installs pnpm through Corepack.
3. Installs OpenSSL because Prisma expects it.
4. Builds `@fyxvo/config`, `@fyxvo/database`, and `@fyxvo/gateway`.
5. Runs the gateway as a non-root user.
6. Exposes port `4100`.
7. Includes a container health check against `GET /health`.

Build the image manually with:

```bash
docker build -f apps/gateway/Dockerfile -t fyxvo-gateway .
```

Run the image manually with:

```bash
docker run --rm -p 4100:4100 \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/fyxvo \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e API_ORIGIN=http://host.docker.internal:4000 \
  fyxvo-gateway
```

If Railway is used as the container host, set `RAILWAY_DOCKERFILE_PATH=apps/gateway/Dockerfile`.

The gateway also honors `PORT` first and falls back to `GATEWAY_PORT`.

Manual Railway setup is:

1. Create a third Railway service from this repository for the gateway.
2. Set the service to build from the Dockerfile path `apps/gateway/Dockerfile`.
3. Reuse the same PostgreSQL and Redis instances as the API and worker.
4. Load environment values from [`apps/gateway/.env.devnet-hosted.example`](../apps/gateway/.env.devnet-hosted.example).
5. Replace `DATABASE_URL` and `REDIS_URL` with the real hosted values.
6. Keep `API_ORIGIN=https://api.fyxvo.com`.
7. Keep `WEB_ORIGIN=https://www.fyxvo.com`.
8. Keep `CORS_ALLOWED_ORIGINS=https://www.fyxvo.com,https://status.fyxvo.com`.
9. Set `GATEWAY_UPSTREAM_RPC_URLS` to the upstream Solana RPC list you want to relay against in production.
10. Deploy and verify `GET /health`, `GET /v1/status`, and `GET /v1/metrics`.
11. Attach `rpc.fyxvo.com` only after the service reports healthy and upstream reachability is true.

Fly.io is the secondary option. If you use Fly instead of Railway for the gateway, keep the same container image, expose port `4100`, map `PORT` to the Fly internal port, and reuse the exact same environment values and custom domain `rpc.fyxvo.com`.

## 6. Devnet Protocol Activation

The services are not considered live until the Anchor program is deployed and the protocol PDAs are initialized on devnet. That activation is complete in the current repository state.

1. Confirm the deployed program ID from source and keypair material.

```bash
pnpm solana:program:build
pnpm solana:protocol:addresses
```

2. The deployer wallet is:

```text
GwBiHc2bFjx5r19MNbnGve5BM1PjoxJ7WXXQHrndPTzr
```

3. Deploy the program.

```bash
pnpm solana:program:deploy:devnet
```

4. Initialize the protocol config, treasury, operator registry, and accepted devnet asset configuration.

```bash
pnpm solana:protocol:init
```

5. Verify that the program exists, the PDAs exist, the accepted asset config is valid, and the authority matches `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem`.

```bash
pnpm solana:protocol:verify
```

6. Seed the first managed operator once a project is activated.

```bash
pnpm solana:operator:seed:managed --project-owner <wallet> --chain-project-id <number>
```

7. The current managed launch operator is wallet `8TZ1Q5TqNmbDkza57ZssfmufMxX8hxoKV28uhWg4Qnph`, with operator account `5DnhYryvZAKWLY6kuzQKYrUdNBCskQ3oZgnrMmj6Fwi6` and reward account `HM3HHtkJDY4gYzeixSfEQp2Hk7VrE8mQoouNhM7q3TEG`.
8. Keep `FYXVO_ENABLE_USDC=false` unless you have explicitly enabled the runtime flag for the already-initialized devnet mint path and intentionally want to expose token funding in the product. SOL funding is the live default path.
9. Run `pnpm solana:flow:devnet-live` to verify a fresh wallet-auth, project activation, SOL funding, gateway access, request logging, and analytics cycle.

## 6.1 Program metadata and explorer trust surfaces

Keep the live program discoverable and verifiable after protocol releases.

1. Upload canonical security metadata using [`security.json`](../security.json).
2. Upload canonical IDL metadata using [`target/idl/fyxvo.json`](../target/idl/fyxvo.json).
3. Publish verified build information for the released program binary.
4. Re-check the public explorer after upload so it no longer shows missing `security.txt`, missing verified build information, or missing domain metadata.
5. Use [`docs/program-metadata.md`](./program-metadata.md) for the exact commands and the expected public trust surfaces.
6. If the current upgrade authority is unavailable, use [`docs/governed-devnet-redeployment.md`](./governed-devnet-redeployment.md) and stage a fresh controlled devnet program instead of faking canonical writes from the admin signer.

## 7. Environment Reference

Use the environment examples this way:

1. [`apps/web/.env.example`](../apps/web/.env.example), [`apps/api/.env.example`](../apps/api/.env.example), [`apps/gateway/.env.example`](../apps/gateway/.env.example), and [`apps/worker/.env.example`](../apps/worker/.env.example) are for local development.
2. [`apps/web/.env.devnet-hosted.example`](../apps/web/.env.devnet-hosted.example), [`apps/api/.env.devnet-hosted.example`](../apps/api/.env.devnet-hosted.example), [`apps/gateway/.env.devnet-hosted.example`](../apps/gateway/.env.devnet-hosted.example), and [`apps/worker/.env.devnet-hosted.example`](../apps/worker/.env.devnet-hosted.example) are the hosted devnet deployment baselines.
3. [`apps/api/.env.devnet-governed.example`](../apps/api/.env.devnet-governed.example), [`apps/gateway/.env.devnet-governed.example`](../apps/gateway/.env.devnet-governed.example), and [`apps/worker/.env.devnet-governed.example`](../apps/worker/.env.devnet-governed.example) are the replacement-program staging baselines when the current upgrade authority is unavailable.
4. The `.env.mainnet.example` files are planning references only. The current shared runtime remains devnet-only until mainnet support is intentionally added.

### 7.1 Shared Runtime

| Variable | Used by | Required in production | Default in code | Notes |
| --- | --- | --- | --- | --- |
| `FYXVO_ENV` | API, gateway, worker | No | `development` | Runtime stage |
| `LOG_LEVEL` | API, gateway, worker | No | `info` | Structured log verbosity |
| `DATABASE_URL` | API, gateway, worker, Prisma | Yes | Local PostgreSQL URL | PostgreSQL connection string |
| `DATABASE_POOL_MAX` | Prisma package | No | `10` | Prisma client pool ceiling |
| `DATABASE_LOG_QUERIES` | Prisma package | No | `false` | Enables Prisma query logs |
| `REDIS_URL` | API, gateway, worker | Yes | Local Redis URL | Redis connection string |
| `SOLANA_CLUSTER` | API, gateway, worker | No | `devnet` | Only `devnet` is supported by shared config today |
| `FYXVO_PROGRAM_ID` | API, gateway, worker, scripts | Yes | `Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc` | Target Anchor program ID for devnet |
| `FYXVO_ADMIN_AUTHORITY` | API, gateway, worker, scripts | Yes | `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem` | Current live protocol authority expectation used by readiness checks |
| `FYXVO_AUTHORITY_MODE` | API, gateway, worker | No | `single-signer` | Honest governance posture indicator for operations surfaces |
| `FYXVO_PROTOCOL_AUTHORITY` | API, gateway, worker | No | Falls back to `FYXVO_ADMIN_AUTHORITY` | Intended protocol authority signer for migration planning |
| `FYXVO_PAUSE_AUTHORITY` | API, gateway, worker | No | Falls back to `FYXVO_PROTOCOL_AUTHORITY` | Intended pause authority signer for migration planning |
| `FYXVO_UPGRADE_AUTHORITY_HINT` | API, gateway, worker | No | None | Runtime hint for the intended upgrade authority or multisig |
| `FYXVO_PROTOCOL_FEE_BPS` | API, gateway, worker, scripts | No | `500` | Initialization fee basis points |
| `FYXVO_ENABLE_USDC` | API, gateway, worker, scripts | No | `false` | Gates USDC flows until the devnet mint path is explicitly enabled |
| `SOLANA_RPC_URL` | API, gateway, worker | No | `https://api.devnet.solana.com` | Solana RPC endpoint |
| `SOLANA_WS_URL` | API, gateway, worker | No | `wss://api.devnet.solana.com/` | Solana WebSocket endpoint |
| `REQUEST_TIMEOUT_MS` | API, gateway, worker | No | `10000` | Shared outbound timeout budget |
| `PORT` | API, gateway | Platform provided | None | Optional host platform override |

### 7.2 Frontend

| Variable | Required in production | Default in code | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | No | `Fyxvo` | Product name in the UI |
| `NEXT_PUBLIC_ALLOW_INDEXING` | No | `false` | Controls robots indexing and follow behavior |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | `http://localhost:4000` | Public API base URL |
| `NEXT_PUBLIC_GATEWAY_BASE_URL` | Yes | `http://localhost:4100` | Public gateway base URL |
| `NEXT_PUBLIC_SITE_URL` | Yes | `http://localhost:3000` | Public frontend origin, for example `https://www.fyxvo.com` |
| `NEXT_PUBLIC_STATUS_PAGE_URL` | No | `<site>/status` | Canonical public status URL, for example `https://status.fyxvo.com` |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | No | `devnet` | Wallet cluster messaging |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | No | `https://api.devnet.solana.com` | Wallet and client read endpoint |
| `NEXT_PUBLIC_ENABLE_USDC` | No | `false` | Enables the USDC funding UX only when backend and protocol config are ready |

## 8. Monitoring And Alerts

Use [`docs/monitoring.md`](./monitoring.md) as the operational companion to this guide.

1. Monitor API and gateway health directly from their hosted endpoints.
2. Use the API admin overview endpoint for worker freshness, recent errors, recent funding, and recent project activity.
3. Route structured logs from API, gateway, and worker into your platform log sink.
4. Alert first on protocol readiness failure, gateway health failure, upstream reachability failure, and stale worker freshness.
5. Use [`docs/operations-runbook.md`](./operations-runbook.md), [`docs/treasury-operations.md`](./treasury-operations.md), and [`docs/data-governance.md`](./data-governance.md) as the operational companions before any mainnet-oriented staging work.

### 7.3 API

| Variable | Required in production | Default in code | Notes |
| --- | --- | --- | --- |
| `API_HOST` | No | `0.0.0.0` | Bind address |
| `API_PORT` | No | `4000` | Used when `PORT` is not present |
| `API_JWT_SECRET` | Yes | Development-only string | Must be at least 32 characters |
| `API_RATE_LIMIT_MAX` | No | `120` | Global Fastify rate limit capacity |
| `API_RATE_LIMIT_WINDOW_MS` | No | `60000` | Global Fastify rate limit window |
| `CORS_ALLOWED_ORIGINS` | No | Empty list | Additional allowed browser origins beyond `WEB_ORIGIN` |
| `USDC_MINT_ADDRESS` | No | Devnet USDC mint | Must match the on-chain protocol config |

### 7.4 Gateway

| Variable | Required in production | Default in code | Notes |
| --- | --- | --- | --- |
| `GATEWAY_HOST` | No | `0.0.0.0` | Bind address |
| `GATEWAY_PORT` | No | `4100` | Used when `PORT` is not present |
| `API_ORIGIN` | Yes | `http://localhost:4000` | Control-plane API base URL |
| `CORS_ALLOWED_ORIGINS` | No | Empty list | Additional allowed browser origins beyond `WEB_ORIGIN` |
| `GATEWAY_REDIS_PREFIX` | No | `fyxvo:gateway` | Redis namespace |
| `GATEWAY_RATE_LIMIT_MAX` | No | `180` | Standard relay capacity |
| `GATEWAY_RATE_LIMIT_WINDOW_MS` | No | `60000` | Standard relay rate window |
| `GATEWAY_PRIORITY_RATE_LIMIT_MAX` | No | `300` | Priority relay capacity |
| `GATEWAY_PRIORITY_RATE_LIMIT_WINDOW_MS` | No | `60000` | Priority relay rate window |
| `GATEWAY_UPSTREAM_TIMEOUT_MS` | No | `5000` | Standard upstream timeout |
| `GATEWAY_PRIORITY_TIMEOUT_MS` | No | `2500` | Priority upstream timeout |
| `GATEWAY_HEALTHCHECK_TIMEOUT_MS` | No | `1500` | Upstream probe timeout |
| `GATEWAY_STANDARD_PRICE_LAMPORTS` | No | `5000` | Standard request base price |
| `GATEWAY_PRIORITY_PRICE_LAMPORTS` | No | `20000` | Priority request base price |
| `GATEWAY_WRITE_METHOD_MULTIPLIER` | No | `4` | Multiplier for write-like RPC methods |
| `GATEWAY_MIN_AVAILABLE_LAMPORTS` | No | `10000` | Reserve floor before a request is blocked |
| `GATEWAY_BALANCE_CACHE_MS` | No | `3000` | On-chain balance cache TTL |
| `GATEWAY_NODE_CACHE_MS` | No | `5000` | Node selection cache TTL |
| `GATEWAY_NODE_FAILURE_COOLDOWN_MS` | No | `15000` | Cooldown after an upstream failure |
| `GATEWAY_UPSTREAM_RPC_URLS` | Yes | `https://api.devnet.solana.com` | Comma-separated upstream Solana RPC node list |

### 7.5 Worker

| Variable | Required in production | Default in code | Notes |
| --- | --- | --- | --- |
| `WORKER_NAME` | No | `fyxvo-worker` | Queue namespace seed |
| `WORKER_INTERVAL_MS` | No | `5000` | Recurring enqueue interval |
| `WORKER_REDIS_PREFIX` | No | `fyxvo:worker` | Redis namespace |
| `WORKER_CONCURRENCY` | No | `4` | BullMQ concurrency |
| `WORKER_REQUEST_LOG_BATCH_SIZE` | No | `1000` | Metrics aggregation batch size |
| `WORKER_SIGNATURE_BATCH_SIZE` | No | `25` | Wallet indexing signature batch size |
| `WORKER_NODE_TIMEOUT_MS` | No | `2500` | Node probe timeout |
| `WORKER_REWARD_WINDOW_MINUTES` | No | `60` | Reward computation window |
| `WORKER_REWARD_LAMPORTS_PER_REQUEST` | No | `250` | Reward weight per request |

## 8. Domain and DNS Runbook

Use this order for cutover:

1. Deploy the API on Railway and verify `/health` and `/v1/status`.
2. Deploy the worker on Railway and verify queue activity in logs.
3. Deploy the gateway container on Railway and verify `/health`, `/v1/status`, and `/v1/metrics`.
4. Deploy the frontend on Vercel and verify `/`, `/dashboard`, `/docs`, and `/status`.
5. Attach custom domains only after all four services pass their direct hosted checks.

Create these DNS records:

1. `www.fyxvo.com` as a `CNAME` to `cname.vercel-dns.com`.
2. `fyxvo.com` as an apex record managed by Vercel. If your DNS provider requires a raw record, use `A 76.76.21.21` and configure the redirect to `https://www.fyxvo.com` inside Vercel.
3. `status.fyxvo.com` as a `CNAME` to `cname.vercel-dns.com`.
4. `api.fyxvo.com` as a `CNAME` to the Railway target shown when you attach the API custom domain.
5. `rpc.fyxvo.com` as a `CNAME` to the Railway target shown when you attach the gateway custom domain.

Hosted cutover checks are:

1. `https://www.fyxvo.com`
2. `https://status.fyxvo.com/status`
3. `https://api.fyxvo.com/health`
4. `https://api.fyxvo.com/v1/status`
5. `https://rpc.fyxvo.com/health`
6. `https://rpc.fyxvo.com/v1/status`

## 9. Verification Before Manual Cutover

Run these checks before deploying:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm test:anchor`
5. `pnpm build`
6. `pnpm dev:full`
7. `pnpm solana:protocol:verify`
8. `docker build -f apps/gateway/Dockerfile -t fyxvo-gateway .`

That sequence validates the frontend, API, gateway, worker, and Anchor program in the same repository state you are about to release.
