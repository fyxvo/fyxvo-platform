# Governed Devnet Staging Snapshot

This records the replacement devnet program staged under keys the team controls. It is not the current hosted cutover yet.

## Staged Replacement Program

1. Program ID: `Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc`
2. Intended protocol authority: `AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem`
3. Controlled upgrade-authority signer used for deployment and canonical metadata: `H61YTCJ6yEtmUBN6c66DgjdEyXs8Eqbq5kJJGQyooqN1`

## Derived Protocol Addresses

1. Protocol config: `J4uiLhB3qaYUFvu6YAT6oTrBbe7qXfwZFfLm2ph5GTAH`
2. Treasury: `HvgY6dGviH5xosaHvVBNKwt2gTTnJYJ9aG7dWC4wqST1`
3. Operator registry: `9k4Xr4qfVMSN14aNkFdDFHbd74syujkyYcGKGTWYxmRQ`
4. Treasury USDC vault: `2epkxnyGfX6FPYRmPa2tystcd1UrvjYFR5wJh6uKZj5i`
5. Program data account: `HAnyLiXvi2b5qABZHaTd7vtYGJxTgstWQidEnyqKe6Sp`

## Canonical Metadata

1. Security metadata account: `ALJmis5DwvQe9srDU4fijrHsUJUmGMuwhH3bJY7ZXkpn`
2. IDL metadata account: `CjVaHhwKNZTPXPJ73gX1YShHCD57xuuDhkrQuhyA5s4s`

## Verification Notes

1. The staged program was deployed on devnet with the controlled governed keypair.
2. Protocol initialization succeeded and readiness returned green.
3. Canonical `security` metadata upload succeeded.
4. Canonical `idl` metadata upload succeeded.
5. The hosted stack still points at the previous live devnet program until a deliberate cutover updates service env and validates the staged flow end to end.

## Next Cutover Steps

1. Stage API, gateway, and worker with the governed env examples and the staged program ID.
2. Run `pnpm solana:flow:devnet-live` against the staged program path.
3. Verify hosted funding, gateway billing, alerts, analytics, request logs, and assistant flows.
4. Only then update hosted `FYXVO_PROGRAM_ID` values and deployment metadata together.
