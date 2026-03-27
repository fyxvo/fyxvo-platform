# Protocol Design

## 1. Scope

The Fyxvo Anchor program is the settlement and accounting layer for funded Solana infrastructure access. It does not store every product concept. It stores the state that must remain authoritative across API nodes, gateway nodes, and operators.

The current program supports:

1. Protocol initialization with a fee basis point setting.
2. Project creation keyed by owner wallet plus `project_id`.
3. SOL and USDC funding.
4. Operator registration against a project.
5. Reward accrual in SOL or USDC.
6. Reward claiming in SOL or USDC.
7. Protocol-wide pause control.

The implementation lives in [`programs/fyxvo/src/lib.rs`](../programs/fyxvo/src/lib.rs).

For devnet activation, the deployed program ID is `Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc` and the configured admin authority is `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem`.

The live devnet protocol addresses are:

1. `ProtocolConfig`: `J4uiLhB3qaYUFvu6YAT6oTrBbe7qXfwZFfLm2ph5GTAH`
2. `Treasury`: `HvgY6dGviH5xosaHvVBNKwt2gTTnJYJ9aG7dWC4wqST1`
3. `OperatorRegistry`: `9k4Xr4qfVMSN14aNkFdDFHbd74syujkyYcGKGTWYxmRQ`
4. Treasury USDC vault: `2epkxnyGfX6FPYRmPa2tystcd1UrvjYFR5wJh6uKZj5i`

## 2. Accounts and PDA Layout

The program uses strict PDA derivation for every protocol-owned account.

1. `ProtocolConfig`
   1. Seed: `["protocol-config"]`
   2. Stores authority, treasury address, operator registry address, USDC mint, fee basis points, pause flag, and bump.
2. `Treasury`
   1. Seed: `["treasury"]`
   2. Stores the linked protocol config, associated token vault address, tracked SOL balance, tracked USDC balance, reserved rewards, protocol fees owed, and bump.
3. `OperatorRegistry`
   1. Seed: `["operator-registry", protocol_config]`
   2. Stores the linked protocol config, total operator registrations, and bump.
4. `ProjectAccount`
   1. Seed: `["project", project_owner, project_id_le_bytes]`
   2. Stores the linked protocol config, treasury, owner, project ID, funded totals, available balances, outstanding rewards, total rewards accrued, and bump.
5. `OperatorAccount`
   1. Seed: `["operator", project, operator]`
   2. Stores the registry, project, operator wallet, reward account, totals claimed, registration timestamp, and bump.
6. `RewardAccount`
   1. Seed: `["reward", operator_account]`
   2. Stores the project, operator account, operator wallet, accrued balances, claimed balances, and bump.

The treasury’s USDC vault is an associated token account owned by the treasury PDA.

## 3. Funding Model

Fyxvo accepts native SOL today and also has an initialized devnet USDC treasury path, but the product keeps USDC runtime-gated by default.

1. `deposit_sol` transfers lamports directly from the funder signer into the treasury PDA account.
2. `deposit_usdc` transfers tokens from the funder token account into the treasury USDC vault with `transfer_checked`.
3. Both deposit paths call the same fee splitter.
4. The protocol fee is `gross_amount * fee_bps / 10_000`.
5. The net amount is recorded as project funding and available balance.
6. The fee amount is recorded as protocol fees owed inside the treasury account.

The program enforces a fee ceiling during initialization. `fee_bps` cannot exceed `2_000`, which is 20 percent. The current devnet runtime config uses `500` basis points.

## 4. Reward Model

Reward accrual and reward claiming are separate phases.

1. A project owner calls `accrue_reward` with an asset and amount.
2. The program subtracts that amount from the project’s available balance.
3. The same amount is added to the project’s outstanding reward balance.
4. The treasury marks the amount as reserved reward inventory so it cannot be treated as free balance.
5. The operator’s `RewardAccount` increments accrued SOL or accrued USDC.
6. The operator later claims through `claim_sol_reward` or `claim_usdc_reward`.
7. Claiming moves only the unclaimed delta between `accrued_*` and `claimed_*`.
8. Claiming also decreases treasury tracked balance, decreases treasury reserved rewards, decreases project outstanding rewards, and increases operator claimed totals.

The worker computes reward snapshots off chain, but the on-chain program remains the final source of truth for actual accrual and claim state.

## 5. Protocol Fees

The program currently accounts for protocol fees but does not yet expose a withdrawal instruction.

1. SOL fees accumulate in `treasury.protocol_sol_fees_owed`.
2. USDC fees accumulate in `treasury.protocol_usdc_fees_owed`.
3. Because there is no withdrawal instruction yet, these balances are observable but not operationally distributable on chain.

This is acceptable for devnet and integration work, but a mainnet release needs a reviewed fee withdrawal path with governance controls.

## 6. Events

The program emits four events that downstream indexers can consume:

1. `Deposit`
2. `OperatorRegistered`
3. `RewardAccrued`
4. `RewardClaimed`

These events contain the project, operator or funder, asset, amount, and running totals needed to reconstruct balance movements from logs.

## 7. Validation and Safety

The program is opinionated about validation.

1. Every protocol-owned account is derived from a known PDA seed.
2. Treasury and project links are checked before balances are touched.
3. The configured USDC mint is enforced wherever token movement occurs.
4. Operator accounts and reward accounts must match the project and operator implied by their seeds.
5. Claims require the operator signer to match the operator recorded in the account.
6. Reward accrual requires the signer to match the project owner.
7. Arithmetic uses checked add and checked subtract helpers so underflow and overflow fail the instruction.
8. The pause flag blocks project creation, deposits, operator registration, accrual, and claims.

## 8. Current Limitations

The current protocol is real, but it is intentionally narrow.

1. It supports devnet only in the shared config package.
2. SOL is the live default funding path. USDC remains configuration-gated in runtime even though the treasury token vault is initialized on chain.
3. Protocol fees are tracked but not withdrawable.
4. Reward accrual is owner-driven. There is no autonomous on-chain reward scheduler.
5. There is no governance wrapper around the protocol authority beyond the single authority pubkey.

Those constraints are fine for the current repository stage. They should stay visible in documentation so no one mistakes devnet integration completeness for mainnet readiness.
