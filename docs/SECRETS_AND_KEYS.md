# Secrets And Keys

This file records the important operational addresses and the secret-handling rules for the Fyxvo platform. It does not contain any private keys, seed phrases, API secrets, or raw environment values. It is safe to commit because it documents custody and storage requirements only.

## Live Operational Wallets

The current admin authority wallet is `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem`. The owner must keep the private key for this wallet outside the repository and outside shared chat history. It should live only in the owner's secure wallet storage, encrypted key management, or an equivalent offline backup path.

The current managed operator wallet is `8TZ1Q5TqNmbDkza57ZssfmufMxX8hxoKV28uhWg4Qnph`. The private key for this wallet must also never be committed to the repository and must never be stored in plaintext on shared machines.

The current live program and protocol addresses are public and can be committed safely because they are addresses, not secrets. The same is true for the protocol config PDA, treasury PDA, operator registry PDA, treasury USDC vault, managed operator account, and managed reward account.

## Railway Secrets

All secret-bearing runtime values belong in Railway, not in the repository. The values currently treated as secrets include `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `API_JWT_SECRET`, `DATABASE_URL`, `DATABASE_PUBLIC_URL` when it contains credentials, `REDIS_URL`, `REDIS_PUBLIC_URL` when it contains credentials, `POSTGRES_PASSWORD`, `PGPASSWORD`, `REDIS_PASSWORD`, `REDISPASSWORD`, and any future private RPC credentials if `SOLANA_RPC_URL` or `GATEWAY_UPSTREAM_RPC_URLS` ever include authenticated provider URLs.

The owner should treat any copied Railway environment export as sensitive operational material. These values must stay in Railway or in a dedicated secret manager and must never be committed to git.

## Repository Rules

No private key, seed phrase, `.env` file, `.pem` file, `.key` file, `id.json`, `keypair.json`, or npm token should ever be committed. The `.gitignore` file blocks the common secret and key patterns, but the operator still needs to review staged changes before every commit.

The npm token used to publish `@fyxvo/sdk` is personal to the owner. It must not be stored anywhere in this repository, in committed shell history, or in shared documentation.

## Before Mainnet

Mainnet launch will require new secret material and new custody decisions. At minimum the owner will need a mainnet program upgrade authority keypair, a mainnet admin authority wallet, the final mainnet protocol authority and pause authority signers, the mainnet RPC endpoint credentials if a paid provider is used, the mainnet gateway upstream credentials if authenticated operator endpoints are used, and fresh production database, Redis, JWT, email, and monitoring secrets if the environment is split from the current devnet stack.

Before any mainnet cutover, confirm that the mainnet authority material is stored outside the repository, that the signer recovery path is documented privately, and that the repository still contains addresses and instructions only, never private values.
