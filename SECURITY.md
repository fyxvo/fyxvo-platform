# Security Policy

## Scope

The following components are in scope for security reports:

- **Anchor program** (`Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc`) — fund accounting, project activation, treasury management
- **API** (`api.fyxvo.com`) — authentication, authorization, project and API key management, webhook delivery
- **Gateway** (`rpc.fyxvo.com`) — API key validation, scope enforcement, request routing, rate limiting
- **Frontend** (`www.fyxvo.com`) — XSS, CSRF, information disclosure, authentication bypass

The following are out of scope:

- Solana validator infrastructure and the devnet chain itself
- Third-party operator nodes not controlled by Fyxvo
- Denial-of-service attacks requiring more than 10,000 requests per second
- Social engineering attacks
- Issues in dependencies that do not have a direct exploitable path in Fyxvo

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report security vulnerabilities by emailing **security@fyxvo.com** with:

1. A clear description of the vulnerability
2. Steps to reproduce or a proof of concept
3. The potential impact
4. Any suggested mitigations

You will receive an acknowledgment within 48 hours. We aim to resolve critical vulnerabilities within 7 days and high-severity issues within 30 days.

## Disclosure Timeline

Fyxvo follows coordinated disclosure with a 90 day disclosure window. We ask reporters to keep issues confidential while we investigate, validate, and ship a fix. If a fix is ready earlier, we prefer to coordinate disclosure as soon as the patch is deployed. If a report remains unresolved near the end of the 90 day window, we will stay in contact with the reporter and publish a shared update on status and mitigation.

## Rewards

Fyxvo is currently a devnet private alpha operated by a solo founder. We cannot offer monetary rewards at this stage. We will:

- Credit you publicly in our changelog and release notes if you wish
- Provide a detailed acknowledgment of the issue resolved
- Add you to a private contributors list for future recognition

We appreciate responsible disclosure regardless of reward.

## Current Security Status

- Devnet only: no real user funds on mainnet
- SOL credits are devnet SOL with no real monetary value
- USDC funding is enabled on devnet
- All sessions use wallet-signed JWTs

For the most current security posture, see [docs/launch-readiness.md](./docs/launch-readiness.md).
