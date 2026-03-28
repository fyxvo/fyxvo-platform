# Fyxvo

Fyxvo is building a decentralized Solana RPC, data, and relay infrastructure network. The current live product is a devnet private alpha that runs on managed infrastructure today as the first operating step toward an open operator network with governed protocol authority and public mainnet participation.

The repo contains the hosted control plane, relay gateway, on-chain protocol, background worker, TypeScript SDK, and web frontend that together form the first version of the network. Today that means wallet authentication, on-chain project activation, funded relay usage, scoped API keys, analytics, alerts, assistant workflows, and public trust surfaces. It also means the operator layer is still managed by the Fyxvo team while the protocol and product harden toward broader operator participation.

## Current State

Fyxvo is live on Solana devnet in a private alpha phase. The web frontend, API, gateway, and worker are deployed and serving real traffic. Projects can be activated on chain, funded with devnet SOL, and routed through the managed relay. Public status, security, reliability, pricing, explore, leaderboard, and project-page surfaces are live. Mainnet is not launched yet, and external operators are not onboarding into the live network yet.

## Architecture

### API Control Plane

`apps/api` is the control plane for wallet authentication, JWT sessions, project creation, activation verification, funding workflows, API keys, analytics, alerts, assistant conversations, team workflows, public pages, referrals, support, and admin operations. It is the system that keeps the web product, billing state, and on-chain project lifecycle aligned.

### Relay Gateway

`apps/gateway` is the JSON-RPC and relay plane. It validates API keys and scopes, prices requests, enforces project funding checks, routes traffic to configured upstream nodes, records request logs, and exposes health and gateway status. The code supports routing across configured upstream URLs, but the current live deployment is still managed infrastructure rather than an open external operator marketplace.

### On-Chain Anchor Program

`programs/fyxvo` and `packages/config/src/protocol.ts` define the on-chain protocol. The program manages protocol config, treasury state, per-project activation state, and operator-registry state on Solana devnet. The live addresses are public and verifiable, but the network is still operating under a managed authority model while governed migration and broader operator participation are prepared.

### Worker

`apps/worker` runs async operational tasks such as rollups, notifications, digests, indexing, alert processing, and reward-related background jobs. It supports the control plane and relay plane without putting that work on the synchronous request path.

### TypeScript SDK

`packages/sdk` provides a TypeScript client for teams that want to integrate Fyxvo programmatically. It is meant to make relay access and API usage easier from external applications and services.

### Web Frontend

`apps/web` is the Next.js frontend for the public marketing site, documentation, pricing, status, operator onboarding, and the authenticated workspace for projects, funding, API keys, analytics, alerts, support, playground, and assistant usage.

## Decentralization Roadmap

### Phase One: Managed Devnet Alpha

The current live phase runs on managed infrastructure owned and operated by the team. This phase is about proving the product contract, validating funded routing, hardening the control plane and relay, and making the on-chain state and operating posture visible.

### Phase Two: External Operator Onboarding

The next step is to introduce external operators into the network. That work includes operator onboarding flows, operator registration, revenue routing, better visibility into node performance, and reducing dependence on a single managed signer and a single managed node pool.

### Phase Three: Governed Open Network

The long-term direction is a fully open operator network with governed protocol authority, transparent economics, and a mainnet launch only after devnet operating, authority, treasury, and rollback controls are ready. This repo does not claim that this phase is live today.

## Live Deployment

- App: `https://www.fyxvo.com`
- API: `https://api.fyxvo.com`
- Gateway: `https://rpc.fyxvo.com`
- Status: `https://status.fyxvo.com`
- Docs: `https://www.fyxvo.com/docs`

## Current Network State

The live network is currently running on Solana devnet with the program deployed at [`Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc`](https://explorer.solana.com/address/Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc?cluster=devnet). The public operator network summary currently reports `1` active operator in the managed pool, while the control plane reports `58,858` total requests processed across the live private alpha. The production service URLs are `https://www.fyxvo.com`, `https://api.fyxvo.com`, and `https://rpc.fyxvo.com`.

## Integrating

Developers can integrate through the published SDK in [`packages/sdk`](./packages/sdk/README.md), the hosted docs at `https://www.fyxvo.com/docs`, and the live request builder at `https://www.fyxvo.com/playground`. Together these surfaces cover gateway access, authenticated control-plane flows, and hands-on request testing against the live devnet stack.

## Community

- X: `https://x.com/fyxvo`
- Discord: `https://discord.gg/Uggu236Jgj`
- Telegram: `https://t.me/fyxvo`
- Repository: `https://github.com/fyxvo/fyxvo-platform`

## On-Chain Program And Network Addresses

- Solana cluster: `devnet`
- Program ID: `Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc`
- Protocol admin authority: `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem`
- Protocol config: `J4uiLhB3qaYUFvu6YAT6oTrBbe7qXfwZFfLm2ph5GTAH`
- Treasury: `HvgY6dGviH5xosaHvVBNKwt2gTTnJYJ9aG7dWC4wqST1`
- Operator registry: `9k4Xr4qfVMSN14aNkFdDFHbd74syujkyYcGKGTWYxmRQ`
- Treasury USDC vault: `2epkxnyGfX6FPYRmPa2tystcd1UrvjYFR5wJh6uKZj5i`
- Managed operator wallet: `8TZ1Q5TqNmbDkza57ZssfmufMxX8hxoKV28uhWg4Qnph`
- Managed operator account: `5DnhYryvZAKWLY6kuzQKYrUdNBCskQ3oZgnrMmj6Fwi6`
- Managed reward account: `HM3HHtkJDY4gYzeixSfEQp2Hk7VrE8mQoouNhM7q3TEG`

The live program exposes an operator registry and managed operator accounts on devnet. That does not mean open operator onboarding is live yet. The current network is still team-managed while the decentralization path is being prepared and hardened.

## Revenue Model Direction

The operator economics reflected elsewhere in the product are the network’s intended fee split as Fyxvo opens up operator participation. The target model routes 80 percent of request fees to node operators, 10 percent to the protocol treasury, and 10 percent to the infrastructure fund. In the current managed devnet phase, that split describes the network direction rather than an already-open marketplace for third-party operators.

## Local Development

Install dependencies and bootstrap the monorepo:

- `pnpm install --frozen-lockfile`
- `pnpm --filter @fyxvo/database generate`
- `pnpm --filter @fyxvo/database migrate:dev`
- `pnpm --filter @fyxvo/database seed`

Start the full local stack:

- `pnpm dev:full`

Useful local URLs:

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/health`
- API status: `http://localhost:4000/v1/status`
- Gateway health: `http://localhost:4100/health`

Useful verification commands:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm prod:verify`
- `pnpm prod:smoke`

## Environment Variables

### Shared Runtime Configuration

- `FYXVO_ENV`
- `LOG_LEVEL`
- `DATABASE_URL`
- `REDIS_URL`
- `WEB_ORIGIN`
- `CORS_ALLOWED_ORIGINS`
- `SOLANA_CLUSTER`
- `FYXVO_PROGRAM_ID`
- `FYXVO_ADMIN_AUTHORITY`
- `FYXVO_PROTOCOL_FEE_BPS`
- `FYXVO_ENABLE_USDC`
- `SOLANA_RPC_URL`
- `SOLANA_WS_URL`
- `REQUEST_TIMEOUT_MS`

### API Service

- `API_HOST`
- `API_PORT`
- `API_JWT_SECRET`
- `API_RATE_LIMIT_MAX`
- `API_RATE_LIMIT_WINDOW_MS`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO`
- `EMAIL_DELIVERY_BASE_URL`
- `USDC_MINT_ADDRESS`
- `ANTHROPIC_API_KEY`

### Gateway Service

- `GATEWAY_HOST`
- `GATEWAY_PORT`
- `API_ORIGIN`
- `GATEWAY_REDIS_PREFIX`
- `GATEWAY_RATE_LIMIT_MAX`
- `GATEWAY_RATE_LIMIT_WINDOW_MS`
- `GATEWAY_PRIORITY_RATE_LIMIT_MAX`
- `GATEWAY_PRIORITY_RATE_LIMIT_WINDOW_MS`
- `GATEWAY_UPSTREAM_TIMEOUT_MS`
- `GATEWAY_PRIORITY_TIMEOUT_MS`
- `GATEWAY_HEALTHCHECK_TIMEOUT_MS`
- `GATEWAY_STANDARD_PRICE_LAMPORTS`
- `GATEWAY_COMPUTE_HEAVY_PRICE_LAMPORTS`
- `GATEWAY_PRIORITY_PRICE_LAMPORTS`
- `GATEWAY_WRITE_METHOD_MULTIPLIER`
- `GATEWAY_MIN_AVAILABLE_LAMPORTS`
- `GATEWAY_BALANCE_CACHE_MS`
- `GATEWAY_NODE_CACHE_MS`
- `GATEWAY_NODE_FAILURE_COOLDOWN_MS`
- `GATEWAY_UPSTREAM_RPC_URLS`

### Worker Service

- `API_ORIGIN`
- `GATEWAY_ORIGIN`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO`
- `EMAIL_DELIVERY_BASE_URL`
- `WORKER_NAME`
- `WORKER_INTERVAL_MS`
- `WORKER_REDIS_PREFIX`
- `WORKER_CONCURRENCY`
- `WORKER_REQUEST_LOG_BATCH_SIZE`
- `WORKER_SIGNATURE_BATCH_SIZE`
- `WORKER_NODE_TIMEOUT_MS`
- `ERROR_RATE_ALERT_THRESHOLD`
- `WORKER_REWARD_WINDOW_MINUTES`
- `WORKER_REWARD_LAMPORTS_PER_REQUEST`

### Web Frontend

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_STATUS_PAGE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_GATEWAY_BASE_URL`
- `NEXT_PUBLIC_SOLANA_CLUSTER`
- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `NEXT_PUBLIC_ENABLE_USDC`

## Solana Devnet Workflow

Create or reuse a Solana wallet and point the CLI at devnet:

- `solana-keygen new --outfile ~/.config/solana/id.json`
- `solana config set --url https://api.devnet.solana.com`
- `solana config set --keypair ~/.config/solana/id.json`
- `solana airdrop 2`

Build, deploy, initialize, and verify the program:

- `pnpm solana:program:build`
- `pnpm solana:program:deploy:devnet`
- `pnpm solana:protocol:init`
- `pnpm solana:protocol:verify`
- `pnpm solana:protocol:addresses`

Run the live devnet project funding flow:

- `pnpm solana:flow:devnet-live`

## Honest Positioning

Fyxvo is not claiming that the network is already fully decentralized today. The honest current statement is that Fyxvo is building toward a decentralized Solana RPC, data, and relay infrastructure network, while the live devnet private alpha is still running on managed infrastructure as the first phase of that transition.
