# Fyxvo Operations Handoff

This file is the short operational handoff for future agents and maintainers. It describes what is live, what to verify first, and what still needs manual owner action before a real mainnet launch.

## Live Services

- Web: `https://www.fyxvo.com`
- Status: `https://status.fyxvo.com`
- API: `https://api.fyxvo.com`
- Gateway: `https://rpc.fyxvo.com`
- Vercel project: `fyxvo`
- Vercel project id: `prj_On4svYlyLNJRYXJOQItIz3L7DRg6`
- Railway services: `fyxvo-api`, `fyxvo-gateway`, `fyxvo-worker`, `Postgres`, `Redis`

## Current Devnet Protocol Addresses

- Program ID: `Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc`
- Protocol config PDA: `J4uiLhB3qaYUFvu6YAT6oTrBbe7qXfwZFfLm2ph5GTAH`
- Treasury PDA: `HvgY6dGviH5xosaHvVBNKwt2gTTnJYJ9aG7dWC4wqST1`
- Operator registry PDA: `9k4Xr4qfVMSN14aNkFdDFHbd74syujkyYcGKGTWYxmRQ`
- Treasury USDC vault: `2epkxnyGfX6FPYRmPa2tystcd1UrvjYFR5wJh6uKZj5i`
- Managed operator wallet: `8TZ1Q5TqNmbDkza57ZssfmufMxX8hxoKV28uhWg4Qnph`
- Managed operator account: `5DnhYryvZAKWLY6kuzQKYrUdNBCskQ3oZgnrMmj6Fwi6`
- Managed reward account: `HM3HHtkJDY4gYzeixSfEQp2Hk7VrE8mQoouNhM7q3TEG`

## Current Devnet Readiness Assumptions

The public readiness endpoint is `GET /v1/network/readiness`. The devnet reserve target is intentionally lower than mainnet. It is set to `25 SOL` in code so the private alpha can clear the reserve gate without pretending devnet needs mainnet-sized treasury reserves. When mainnet beta work starts, raise that threshold to at least `500 SOL` and revisit the rest of the gate criteria at the same time.

## First Checks To Run

- `curl -s https://api.fyxvo.com/health`
- `curl -s https://rpc.fyxvo.com/v1/status`
- `curl -s https://api.fyxvo.com/v1/network/stats`
- `curl -s https://api.fyxvo.com/v1/network/readiness`
- `curl -s https://api.fyxvo.com/v1/operators/network`
- `curl -I https://www.fyxvo.com`
- `curl -I https://status.fyxvo.com`

## Deploy Commands

From the repo root:

- API to Railway: `railway up`
- Frontend to Vercel: `npx vercel --prod --yes`

From the repo root for validation:

- `pnpm lint`
- `pnpm --filter @fyxvo/api build`
- `pnpm --filter @fyxvo/web build`
- `pnpm --filter @fyxvo/api test`

## SDK Publish

The npm package is `@fyxvo/sdk`. If the current version is already published, bump the version in `packages/sdk/package.json`, run `pnpm --filter @fyxvo/sdk build`, then publish from `packages/sdk` with `npm publish --access public`. Do not commit npm tokens. `.npmrc` is ignored on purpose.

## Mainnet Work Still Not Done

The mainnet reserve target needs to be raised from the devnet threshold before any mainnet beta. The operator registry on chain is live but public operator onboarding is still a product and governance rollout, not a finished open network. Governance and upgrade authority posture still need to move beyond the current managed setup. Treasury funding, rollback planning, and multisig or governed authority changes should be treated as one coordinated launch sequence.
