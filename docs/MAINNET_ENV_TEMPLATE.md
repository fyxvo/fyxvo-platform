# Mainnet Environment Template

This template is the cutover worksheet for replacing the current devnet values with mainnet values. Fill in the mainnet column before any deploy. The current column reflects the live devnet-hosted setup and the planning references already present in the repository.

## API Service

| Variable | Current devnet value | Mainnet value to fill in |
| --- | --- | --- |
| `SOLANA_CLUSTER` | `devnet` | `mainnet-beta` |
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com` | `REPLACE_WITH_MAINNET_RPC_URL` |
| `SOLANA_WS_URL` | `wss://api.devnet.solana.com/` | `REPLACE_WITH_MAINNET_WS_URL` |
| `FYXVO_PROGRAM_ID` | `Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc` | `REPLACE_WITH_MAINNET_PROGRAM_ID` |
| `FYXVO_ADMIN_AUTHORITY` | `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem` | `REPLACE_WITH_MAINNET_PROTOCOL_AUTHORITY` |
| `FYXVO_AUTHORITY_MODE` | `governed` | `multisig` |
| `FYXVO_PROTOCOL_AUTHORITY` | `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem` | `REPLACE_WITH_MAINNET_PROTOCOL_AUTHORITY` |
| `FYXVO_PAUSE_AUTHORITY` | `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem` | `REPLACE_WITH_MAINNET_PAUSE_AUTHORITY` |
| `FYXVO_UPGRADE_AUTHORITY_HINT` | `H61YTCJ6yEtmUBN6c66DgjdEyXs8Eqbq5kJJGQyooqN1` | `REPLACE_WITH_MAINNET_UPGRADE_AUTHORITY_HINT` |
| `USDC_MINT_ADDRESS` | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | `REPLACE_WITH_MAINNET_USDC_MINT` |

## Gateway Service

| Variable | Current devnet value | Mainnet value to fill in |
| --- | --- | --- |
| `SOLANA_CLUSTER` | `devnet` | `mainnet-beta` |
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com` | `REPLACE_WITH_MAINNET_RPC_URL` |
| `SOLANA_WS_URL` | `wss://api.devnet.solana.com/` | `REPLACE_WITH_MAINNET_WS_URL` |
| `FYXVO_PROGRAM_ID` | `Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc` | `REPLACE_WITH_MAINNET_PROGRAM_ID` |
| `FYXVO_ADMIN_AUTHORITY` | `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem` | `REPLACE_WITH_MAINNET_PROTOCOL_AUTHORITY` |
| `FYXVO_AUTHORITY_MODE` | `governed` | `multisig` |
| `FYXVO_PROTOCOL_AUTHORITY` | `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem` | `REPLACE_WITH_MAINNET_PROTOCOL_AUTHORITY` |
| `FYXVO_PAUSE_AUTHORITY` | `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem` | `REPLACE_WITH_MAINNET_PAUSE_AUTHORITY` |
| `FYXVO_UPGRADE_AUTHORITY_HINT` | `H61YTCJ6yEtmUBN6c66DgjdEyXs8Eqbq5kJJGQyooqN1` | `REPLACE_WITH_MAINNET_UPGRADE_AUTHORITY_HINT` |
| `USDC_MINT_ADDRESS` | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | `REPLACE_WITH_MAINNET_USDC_MINT` |
| `GATEWAY_UPSTREAM_RPC_URLS` | `https://api.devnet.solana.com` | `REPLACE_WITH_MAINNET_OPERATOR_OR_PROVIDER_RPC_URLS` |

## Worker Service

| Variable | Current devnet value | Mainnet value to fill in |
| --- | --- | --- |
| `SOLANA_CLUSTER` | `devnet` | `mainnet-beta` |
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com` | `REPLACE_WITH_MAINNET_RPC_URL` |
| `SOLANA_WS_URL` | `wss://api.devnet.solana.com/` | `REPLACE_WITH_MAINNET_WS_URL` |
| `FYXVO_PROGRAM_ID` | `Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc` | `REPLACE_WITH_MAINNET_PROGRAM_ID` |
| `FYXVO_ADMIN_AUTHORITY` | `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem` | `REPLACE_WITH_MAINNET_PROTOCOL_AUTHORITY` |
| `FYXVO_AUTHORITY_MODE` | `governed` | `multisig` |
| `FYXVO_PROTOCOL_AUTHORITY` | `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem` | `REPLACE_WITH_MAINNET_PROTOCOL_AUTHORITY` |
| `FYXVO_PAUSE_AUTHORITY` | `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem` | `REPLACE_WITH_MAINNET_PAUSE_AUTHORITY` |
| `FYXVO_UPGRADE_AUTHORITY_HINT` | `H61YTCJ6yEtmUBN6c66DgjdEyXs8Eqbq5kJJGQyooqN1` | `REPLACE_WITH_MAINNET_UPGRADE_AUTHORITY_HINT` |
| `USDC_MINT_ADDRESS` | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | `REPLACE_WITH_MAINNET_USDC_MINT` |

## Vercel Frontend

| Variable | Current devnet value | Mainnet value to fill in |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.fyxvo.com` | `KEEP_CURRENT_VALUE_OR_REPLACE_IF_MAINNET_API_DOMAIN_DIFFERS` |
| `NEXT_PUBLIC_GATEWAY_BASE_URL` | `https://rpc.fyxvo.com` | `KEEP_CURRENT_VALUE_OR_REPLACE_IF_MAINNET_GATEWAY_DOMAIN_DIFFERS` |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `devnet` | `mainnet-beta` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | `https://api.devnet.solana.com` | `REPLACE_WITH_MAINNET_PUBLIC_RPC_URL` |
| `NEXT_PUBLIC_ENABLE_USDC` | `true` | `true_OR_false_DEPENDING_ON_MAINNET_FUNDING_POLICY` |

## Derived Mainnet Protocol Addresses To Record

These are not the primary env vars, but they must be filled into the launch worksheet after the mainnet protocol initialization completes.

| Address | Current devnet value | Mainnet value to fill in |
| --- | --- | --- |
| Program ID | `Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc` | `REPLACE_WITH_MAINNET_PROGRAM_ID` |
| Protocol config PDA | `J4uiLhB3qaYUFvu6YAT6oTrBbe7qXfwZFfLm2ph5GTAH` | `REPLACE_WITH_MAINNET_PROTOCOL_CONFIG_PDA` |
| Treasury PDA | `HvgY6dGviH5xosaHvVBNKwt2gTTnJYJ9aG7dWC4wqST1` | `REPLACE_WITH_MAINNET_TREASURY_PDA` |
| Operator registry PDA | `9k4Xr4qfVMSN14aNkFdDFHbd74syujkyYcGKGTWYxmRQ` | `REPLACE_WITH_MAINNET_OPERATOR_REGISTRY_PDA` |
| Treasury USDC vault | `2epkxnyGfX6FPYRmPa2tystcd1UrvjYFR5wJh6uKZj5i` | `REPLACE_WITH_MAINNET_TREASURY_USDC_VAULT` |
| Managed operator wallet | `8TZ1Q5TqNmbDkza57ZssfmufMxX8hxoKV28uhWg4Qnph` | `REPLACE_WITH_MAINNET_MANAGED_OPERATOR_WALLET` |
| Managed operator account | `5DnhYryvZAKWLY6kuzQKYrUdNBCskQ3oZgnrMmj6Fwi6` | `REPLACE_WITH_MAINNET_MANAGED_OPERATOR_ACCOUNT` |
| Managed reward account | `HM3HHtkJDY4gYzeixSfEQp2Hk7VrE8mQoouNhM7q3TEG` | `REPLACE_WITH_MAINNET_MANAGED_REWARD_ACCOUNT` |
