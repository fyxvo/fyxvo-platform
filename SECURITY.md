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

| Step | Timeframe |
|------|-----------|
| Acknowledgment | Within 48 hours of report |
| Initial assessment | Within 5 business days |
| Fix deployed (critical) | Within 7 days |
| Fix deployed (high) | Within 30 days |
| Fix deployed (medium/low) | Best effort |
| Public disclosure | After fix is deployed, coordinated with reporter |

We follow coordinated disclosure. We ask that reporters keep the issue confidential until we have deployed a fix.

## Rewards

Fyxvo is currently a devnet private alpha operated by a solo founder. We cannot offer monetary rewards at this stage. We will:

- Credit you publicly in our changelog and release notes if you wish
- Provide a detailed acknowledgment of the issue resolved
- Add you to a private contributors list for future recognition

We appreciate responsible disclosure regardless of reward.

## Current Security Status

- Devnet only: no real user funds on mainnet
- SOL credits are devnet SOL with no real monetary value
- USDC funding is currently gated and not active
- All sessions use wallet-signed JWTs

For the most current security posture, see [docs/launch-readiness.md](./docs/launch-readiness.md).
