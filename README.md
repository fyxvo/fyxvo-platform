# Fyxvo

Fyxvo is a live Solana devnet control plane for funded RPC relay access, wallet-authenticated project management, on-chain SOL and USDC funding, scoped API keys, request analytics, alerts, webhooks, and operator onboarding. The hosted stack is already running with a managed gateway, public trust surfaces, and a published operator path on top of the live devnet protocol.

The current deployment runs on Solana devnet. The protocol addresses are public, the control plane and relay are live, USDC support is enabled, and the operator network layer is partially opened through registration and approval workflows. The network is not yet a public mainnet operator marketplace, and the authority model is still managed while the mainnet path is hardened.

## Services

- Web: `https://www.fyxvo.com`
- API: `https://api.fyxvo.com`
- Gateway: `https://rpc.fyxvo.com`
- Status: `https://status.fyxvo.com`
- Docs: `https://www.fyxvo.com/docs`

## Architecture

`apps/web` contains the public site and authenticated workspace. `apps/api` is the control plane for auth, projects, funding, analytics, alerts, support, and admin workflows. `apps/gateway` is the metered JSON-RPC relay with API-key enforcement and upstream routing. `apps/worker` runs background jobs, notifications, and rollups. `programs/fyxvo` and `packages/config` define the on-chain protocol and live devnet addresses. `packages/sdk` is the published TypeScript SDK for gateway and control-plane integrations.

## Live Devnet Addresses

- Program ID: `Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc`
- Protocol config PDA: `J4uiLhB3qaYUFvu6YAT6oTrBbe7qXfwZFfLm2ph5GTAH`
- Treasury PDA: `HvgY6dGviH5xosaHvVBNKwt2gTTnJYJ9aG7dWC4wqST1`
- Operator registry PDA: `9k4Xr4qfVMSN14aNkFdDFHbd74syujkyYcGKGTWYxmRQ`
- Treasury USDC vault: `2epkxnyGfX6FPYRmPa2tystcd1UrvjYFR5wJh6uKZj5i`

## Local Development

- Install dependencies: `pnpm install --frozen-lockfile`
- Generate Prisma client: `pnpm --filter @fyxvo/database generate`
- Start the stack: `pnpm dev:full`
- Lint: `pnpm lint`
- API tests: `pnpm --filter @fyxvo/api test`
- Build: `pnpm build`

## Integration

- Docs: `https://www.fyxvo.com/docs`
- Playground: `https://www.fyxvo.com/playground`
- SDK guide: [`packages/sdk/README.md`](./packages/sdk/README.md)

## Operations

For the current deployment state, live addresses, deploy commands, devnet readiness notes, and the handoff checklist for future agents, read [`docs/OPERATIONS.md`](./docs/OPERATIONS.md). For the eventual mainnet cutover, use [`docs/MAINNET_RUNBOOK.md`](./docs/MAINNET_RUNBOOK.md) and [`docs/MAINNET_ENV_TEMPLATE.md`](./docs/MAINNET_ENV_TEMPLATE.md).

## Community

- X: `https://x.com/fyxvo`
- Discord: `https://discord.gg/Uggu236Jgj`
- Telegram: `https://t.me/fyxvo`
