# Fyxvo Mainnet Beta Runbook

This runbook prepares the move from the current devnet private alpha to a controlled Solana mainnet beta. It does not authorize an automatic launch. Every step below should be treated as a human-reviewed release sequence with a clear go or no-go decision at each stage.

## 1. Prerequisites

Mainnet beta should not begin until the operating wallets and treasury are funded with at least `160 SOL` in total. The working minimum is split across four purposes so launch funding is not consumed by a single class of transaction.

- `50 SOL` for the protocol treasury reserve.
- `30 SOL` for program deployment, upgrade, and verification transactions.
- `50 SOL` for the initial user liquidity buffer that absorbs project activation and first funding flows.
- `30 SOL` for the ops buffer that covers managed operator activity, emergency transactions, and launch-day overhead.
- `160 SOL` minimum total before any mainnet cutover.

Before the deploy day, confirm that the current devnet stack has been stable for at least seven days, the public readiness gate is fully green, the CI pipeline is green on `main`, the ops handoff in [`docs/OPERATIONS.md`](./OPERATIONS.md) has been reviewed, and the multisig or governed signer plan is finalized. The current live devnet program ID is `Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc`; use it as the source-of-truth code lineage, not as the future mainnet program ID.

## 2. Anchor Program Mainnet Deployment

The mainnet deployment should use the current on-chain program code as the release baseline while generating a new mainnet program keypair and new PDAs. Do not reuse the devnet program address.

Build the release artifact from the repository root:

```bash
anchor build
```

Or use the repository wrapper:

```bash
pnpm solana:program:build
```

Create or provide the mainnet program keypair and upgrade-authority wallet before deploy. Then deploy against Solana mainnet beta:

```bash
export ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com
export ANCHOR_WALLET=~/.config/solana/fyxvo-mainnet-upgrade-authority.json
solana program deploy \
  --url https://api.mainnet-beta.solana.com \
  --program-id ~/.config/solana/fyxvo-mainnet-program-keypair.json \
  target/deploy/fyxvo.so
```

After deploy, record the new program ID, the program data address, the upgrade authority, the deploy slot, the deploy signature, and the exact git commit used for the binary. Then verify the program account on mainnet, verify the loader metadata, and confirm the deployed binary matches the repository build. If build verification tooling is used, run it before public traffic is allowed to reach the mainnet gateway.

## 3. Protocol Initialization On Mainnet

Once the program is live, initialize the protocol accounts on mainnet in the same logical order used on devnet. The mainnet configuration must create a fresh protocol config PDA, treasury PDA, operator registry PDA, and treasury token vaults.

The first transaction should execute the protocol initialization path equivalent to `create_protocol_config`. This sets the protocol authority, fee basis points, accepted asset policy, treasury linkage, and the initial operator registry linkage. After that, initialize the treasury accounts and token vaults that correspond to the chosen funding policy. Then initialize the operator registry so managed operators can be seeded intentionally before any public operator onboarding opens.

Use the existing scripts as the execution baseline and swap the cluster, RPC endpoint, authority wallet, and mainnet program ID before running them:

```bash
export SOLANA_CLUSTER=mainnet-beta
export SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
export FYXVO_PROGRAM_ID=<MAINNET_PROGRAM_ID>
export FYXVO_ADMIN_AUTHORITY=<MAINNET_PROTOCOL_AUTHORITY>
pnpm solana:protocol:init
pnpm solana:protocol:verify
pnpm solana:protocol:addresses
```

Record the resulting mainnet addresses immediately after initialization:

- Program ID
- Protocol config PDA
- Treasury PDA
- Operator registry PDA
- Treasury SOL account balance
- Treasury USDC vault if USDC is enabled at launch

## 4. Authority Migration

The current devnet posture still reflects a managed single-signer model. Mainnet beta should not launch with that posture. Before public mainnet traffic is allowed, move upgrade authority and protocol authority responsibilities to a multisig or another governed signer arrangement that the team actually controls.

The recommended order is to create the target signer set first, record every signer and recovery path in internal operations notes, move the upgrade authority, move the protocol authority, move the pause authority, update the hosted runtime configuration to reflect the governed signer set, and then re-run protocol verification plus a full funding and gateway smoke test. Keep the intended signer IDs in env and documentation so the public admin surfaces and future agents can verify them without tribal knowledge.

## 5. Railway Environment Changes

Each Railway service will need a coordinated cluster change from devnet to mainnet beta. The values below must be updated in `fyxvo-api`, `fyxvo-gateway`, and `fyxvo-worker` before the cutover deployment.

- `SOLANA_CLUSTER=mainnet-beta`
- `SOLANA_RPC_URL=https://api.mainnet-beta.solana.com` or the chosen paid mainnet RPC
- `SOLANA_WS_URL=wss://api.mainnet-beta.solana.com/` or the matching provider WebSocket endpoint
- `FYXVO_PROGRAM_ID=<MAINNET_PROGRAM_ID>`
- `FYXVO_ADMIN_AUTHORITY=<MAINNET_PROTOCOL_AUTHORITY>`
- `FYXVO_PROTOCOL_AUTHORITY=<MAINNET_PROTOCOL_AUTHORITY_OR_MULTISIG>`
- `FYXVO_PAUSE_AUTHORITY=<MAINNET_PAUSE_AUTHORITY_OR_MULTISIG>`
- `FYXVO_UPGRADE_AUTHORITY_HINT=<MAINNET_UPGRADE_AUTHORITY_OR_MULTISIG>`
- `USDC_MINT_ADDRESS=<MAINNET_USDC_MINT_IF_ENABLED>`

The following derived addresses will also change and must be recorded as part of the cutover sheet even if they are not stored directly as env vars:

- Protocol config PDA
- Treasury PDA
- Operator registry PDA
- Treasury USDC vault
- Managed operator account
- Managed reward account

The gateway service also needs its upstream RPC list replaced with mainnet operator or provider endpoints, and the API plus worker services must be pointed at the same mainnet cluster so funding verification, analytics, reward processing, and reconciliation all agree on signatures and balances.

## 6. Vercel Environment Changes

The frontend does not need a new code path for mainnet, but it does need a coordinated environment update before public mainnet beta opens.

- `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta`
- `NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com` or the chosen public wallet-friendly mainnet RPC
- `NEXT_PUBLIC_ENABLE_USDC=true` only if the mainnet treasury vault and backend support are ready
- `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_GATEWAY_BASE_URL` stay on the current domains unless separate mainnet domains are introduced

If the public domains stay the same, deploy the frontend only after API and gateway have already been cut over and verified. If separate mainnet domains are introduced, update canonical URLs, navigation links, embed documentation, and public trust surfaces before launch.

## 7. Post-Launch Smoke Test Sequence

Run the full smoke sequence immediately after the mainnet deployment and again after the first operator traffic is observed:

1. Confirm `GET /health` is `ok` and `assistantAvailable` is still true if assistant access is intended on mainnet.
2. Confirm `GET /v1/network/readiness` is `ready=true`.
3. Confirm `GET /v1/status` on the API and gateway shows the correct mainnet program ID and cluster.
4. Create a fresh wallet-authenticated user session.
5. Create a test project.
6. Sign and verify a project activation transaction on mainnet.
7. Prepare, sign, submit, and verify a SOL funding transaction.
8. If USDC is enabled, repeat the funding test with USDC.
9. Create a scoped API key.
10. Send a standard relay request and a priority relay request through the gateway.
11. Confirm request logs, analytics, alerts, and transactions show the mainnet traffic.
12. Confirm the status page, network page, public readiness page, and widget surfaces all reflect the mainnet deployment.

## 8. First-24-Hour Rollback Plan

If the first 24 hours reveal a protocol, billing, gateway, operator, or treasury issue, stop taking new traffic before attempting ad hoc fixes. Use the pause authority if the protocol needs to stop accepting on-chain actions. Disable or rotate public API keys that are routing traffic into a broken path. Move the gateway back to a safe managed upstream pool if the operator network is unstable. Roll the API, worker, and gateway services back to the last known-good deployment only if their database migrations are compatible with the rollback target.

If the fault is in the newly deployed program binary or authority posture, do not attempt a hurried forward fix without first deciding whether the safer path is to pause the protocol, keep the web and status surfaces honest, and recover in a controlled maintenance window. Record every incident decision, keep the status page updated, reconcile treasury and user-facing balances before reopening, and do not resume public promotion until the smoke test sequence passes again end to end.
