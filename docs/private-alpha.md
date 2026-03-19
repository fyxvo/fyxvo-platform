# Private Alpha Guide

## 1. What the alpha is

Fyxvo is live on Solana devnet with the SOL funding path turned on, hosted control-plane services deployed, and managed relay infrastructure in place.

This stage is a private alpha for a small number of external teams that want to validate:

1. Wallet-authenticated project control.
2. Real on-chain project activation.
3. SOL-funded relay usage.
4. Scoped API key issuance.
5. Request logging, analytics, and status visibility.

It is not a mainnet launch, not a paid SLA product, and not an open operator marketplace.

## 2. What is live today

1. Wallet auth is live.
2. Project activation is live against the deployed devnet program.
3. SOL funding is live.
4. Standard relay and priority relay are live.
5. Request logging and analytics rollups are live.
6. Public status and hosted health surfaces are live.

## 3. What is intentionally limited

1. USDC remains configuration-gated.
2. Protocol authority is still single-signer.
3. Operator supply is managed infrastructure first.
4. Team collaboration is still owner-admin oriented rather than full multi-user project membership.

## 4. Which teams are a good fit right now

The best alpha teams are:

1. Solana developers validating real funded relay behavior on devnet.
2. Teams that can work with a calm but still evolving launch surface.
3. Teams that can give specific feedback about onboarding, funding, RPC behavior, or analytics.

## 5. How founder follow-up should work

Keep the founder loop lightweight and specific.

1. Review the actual use case first, not just the company name.
2. Check expected request volume and whether priority relay is part of the workload.
3. Decide whether the next step is quickstart, rollout planning, or direct support.
4. Keep follow-up notes simple: owner, date, use case, first blocker, and next action.
5. Do not promise mainnet posture, fake SLAs, or open-operator supply that the product does not support today.

## 6. Recommended onboarding checklist

1. Confirm the team understands that Fyxvo is a devnet alpha.
2. Confirm the team has a supported Solana wallet on devnet.
3. Create and activate one project.
4. Fund the project with a small SOL transaction.
5. Create one scoped API key.
6. Send one request to `/rpc`.
7. Confirm that analytics and status update.
8. Capture any friction through the feedback or support path.

## 7. What feedback is most useful

The best alpha feedback includes:

1. The exact page or step where the issue started.
2. Whether the project had already been activated.
3. Whether funding had already confirmed.
4. Whether the issue blocked the first successful request.
5. Enough detail to reproduce or understand the operational impact.
