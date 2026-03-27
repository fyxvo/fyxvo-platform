# Governed Devnet Redeployment Plan

Use this plan if the current devnet program still works but its upgrade authority is not recoverable.

## 1. What This Plan Does

This plan keeps the current live devnet program running for continuity while you stage a fresh devnet program under keys you actually control.

1. Create a new controlled upgrade-authority keypair.
2. Create a fresh program keypair for the replacement devnet program.
3. Reuse the existing protocol admin signer for continuity if a multisig is not ready yet.
4. Stage API, gateway, and worker against the new program first.
5. Cut traffic only after the staged flow passes end to end.

This is the fastest honest recovery path. It is safer than pretending the old admin signer can control a program whose upgrade authority is missing.

## 2. Recommended Immediate Signer Model

For the replacement devnet deployment:

1. `Upgrade authority`: a new dedicated key or multisig that the team controls and can back up safely.
2. `Protocol authority`: the current admin signer `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem` unless a governed signer is already ready.
3. `Pause authority`: the same as protocol authority for continuity until the program logic is upgraded to separate that control path.

For eventual mainnet:

1. Move upgrade authority to multisig or governed signer.
2. Move protocol authority to multisig or governed signer.
3. Only then claim governed production posture publicly.

## 3. Create Controlled Keys

```bash
solana-keygen new -o ~/.config/solana/fyxvo-governed-upgrade-authority.json
solana-keygen new -o ~/.config/solana/fyxvo-governed-program-keypair.json
```

Back up both files outside the deploy machine before you continue.

## 4. Generate The Redeploy Plan

Use the helper script to print the exact runtime env block and rollout checklist.

```bash
TARGET_FYXVO_PROTOCOL_AUTHORITY=AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem \
TARGET_FYXVO_PAUSE_AUTHORITY=AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem \
TARGET_FYXVO_UPGRADE_AUTHORITY=$(solana-keygen pubkey ~/.config/solana/fyxvo-governed-upgrade-authority.json) \
pnpm solana:governed:plan
```

If you already know the target replacement program ID, add:

```bash
TARGET_FYXVO_PROGRAM_ID=<new_program_id>
```

## 5. Deploy The Replacement Devnet Program

```bash
export ANCHOR_WALLET=~/.config/solana/fyxvo-governed-upgrade-authority.json
export FYXVO_PROGRAM_KEYPAIR_PATH=~/.config/solana/fyxvo-governed-program-keypair.json

pnpm solana:program:build
pnpm solana:program:deploy:devnet --generate-program-id
```

Important:

1. The current repo deploy script syncs the program ID into the repo, so make that change intentionally on a dedicated branch.
2. Do not overwrite the currently live program ID in production env until the staged flow is green.

## 6. Initialize Protocol State

Use the intended protocol authority as the admin signer for the replacement program.

```bash
FYXVO_ADMIN_AUTHORITY=AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem \
pnpm solana:protocol:init
```

Then verify:

```bash
pnpm solana:protocol:verify
pnpm solana:flow:devnet-live
```

## 7. Stage Hosted Services

Use the governed devnet env examples:

1. [apps/api/.env.devnet-governed.example](../apps/api/.env.devnet-governed.example)
2. [apps/gateway/.env.devnet-governed.example](../apps/gateway/.env.devnet-governed.example)
3. [apps/worker/.env.devnet-governed.example](../apps/worker/.env.devnet-governed.example)

Set:

1. `FYXVO_PROGRAM_ID` to the replacement program ID
2. `FYXVO_AUTHORITY_MODE=governed`
3. `FYXVO_PROTOCOL_AUTHORITY` to the intended protocol signer
4. `FYXVO_PAUSE_AUTHORITY` to the intended pause signer
5. `FYXVO_UPGRADE_AUTHORITY_HINT` to the controlled upgrade-authority signer or multisig

## 8. Cutover Rules

Do not cut hosted traffic until all of these are true:

1. `/health` and `/v1/status` are green on the staged stack
2. protocol readiness is green on the replacement program
3. funding, gateway billing, analytics, alerts, assistant, and request logs work on the replacement program
4. canonical `security` and `idl` metadata are uploaded with the new upgrade authority
5. verified build upload is completed for the replacement binary

## 9. What To Leave Alone

Until cutover:

1. Keep the current devnet program available for continuity
2. Do not claim the old program is governed
3. Do not rotate production env to the new program ID early
4. Do not discard the old admin signer until the replacement stack is verified and documented
