# Program Metadata Guide

Fyxvo publishes three different trust surfaces for the live Solana program:

1. Embedded binary `security.txt` data inside the Anchor program binary.
2. Canonical on-chain program metadata accounts for `security` and `idl`.
3. Verified build data uploaded by the program upgrade authority.

## Files in this repository

1. Program source with embedded security metadata:
   [`programs/fyxvo/src/lib.rs`](../programs/fyxvo/src/lib.rs)
2. Canonical security metadata upload file:
   [`security.json`](../security.json)
3. Canonical IDL upload file:
   [`target/idl/fyxvo.json`](../target/idl/fyxvo.json)

## Check current on-chain state

```bash
pnpm solana:program:metadata:fetch:security
pnpm solana:program:metadata:fetch:idl
```

If the canonical metadata accounts do not exist yet, the CLI reports `Account not found`.

## Upload canonical security metadata

Run this as the real program upgrade authority:

```bash
export FYXVO_UPGRADE_KEY=~/.config/solana/<upgrade-authority>.json
pnpm solana:program:metadata:write:security
```

The uploaded metadata points users and researchers to:

1. `https://www.fyxvo.com`
2. `https://www.fyxvo.com/security`
3. `security@fyxvo.com`
4. `https://github.com/fyxvo/fyxvo-platform`

## Upload canonical IDL metadata

Run this as the real program upgrade authority after the latest Anchor build:

```bash
export FYXVO_UPGRADE_KEY=~/.config/solana/<upgrade-authority>.json
pnpm solana:program:metadata:write:idl
```

## Verified build upload

Verified build information must also be uploaded by the real program authority. Keep the repository commit and local build inputs aligned first, then use the `solana-verify` CLI for:

```bash
cargo install solana-verify --version 0.4.11 --locked
docker --version
pnpm solana:program:verify-build
```

The verified-build flow requires Docker in the environment because `solana-verify` performs the deterministic build inside a container. If Docker is not installed, the verification upload cannot complete from that machine.

Use the same released source tree and program artifact that produced the deployed binary. The verified-build flow should point at:

1. program id `FQ5pyjBQvfadKPPxd66YXksgn8veYnjEw2R1g6aQnFaa`
2. repository `https://github.com/fyxvo/fyxvo-platform`
3. crate / library name `fyxvo`

After upload, confirm the Solana explorer no longer shows:

1. `Program has no security.txt`
2. `Verified build information not yet uploaded by the program authority`
3. `No domain name found`

## Web security.txt

Fyxvo also publishes a standard web security file at:

```text
https://www.fyxvo.com/.well-known/security.txt
```

That file is separate from Solana program metadata, but it reinforces the public trust surface and gives explorers and researchers a stable domain-level contact point.
