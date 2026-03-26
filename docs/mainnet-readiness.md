# Mainnet Readiness

## 1. What Was Tightened Now

The repository is still a devnet launch, but a few mainnet-facing edges are stronger than they were before this pass.

1. The API now rejects a production boot that still uses the development JWT secret placeholder.
2. API, gateway, and worker startup failures now emit structured error events instead of raw process dumps.
3. API and gateway handler failures now log sanitized error summaries instead of whole error objects.
4. API and gateway responses now explicitly send `cache-control: no-store` to reduce stale caching of auth, status, and relay surfaces.
5. Worker recurring jobs now retry with exponential backoff and remove failed singleton jobs so one failed run does not stall the queue forever.

## 2. Top Mainnet Gaps

Fyxvo is credible on devnet. It is not ready for paid mainnet traffic without deliberate hardening in five areas.

### 2.1 Security

1. The control plane still uses single-wallet ownership, not governed admin separation for project teams.
2. Admin authority, program upgrade authority, and pause authority still need governed signer or multisig control.
3. Session revocation exists through `sessionVersion`, but there is no dedicated operator-facing session revocation or suspicious-login response tooling yet.
4. Request logs, user agents, and IP addresses still need an explicit retention and redaction policy before paid traffic.

### 2.2 Reliability

1. Redis currently backs spend counters, queue state, and rate limiting. Mainnet needs a persistence and failover policy that is tested, not assumed.
2. Gateway upstream fallback is solid, but upstream selection is still endpoint-list driven. Mainnet needs authenticated node access and a clearer degraded-node policy for priority traffic.
3. PostgreSQL migration execution is prepared, but mainnet needs a locked deployment procedure with migration review, rollback steps, and restore drills.
4. Worker jobs are retry-safe now, but replay and backfill procedures still need to be rehearsed against realistic traffic.

### 2.3 Protocol and Treasury

1. Fee accounting exists on chain, but audited fee withdrawal and treasury reconciliation procedures are still required before handling real revenue.
2. The current accepted-asset setup is devnet-first. Mainnet requires an explicit launch decision on SOL-only versus dual-asset funding.
3. Reward accounting is real, but the settlement authority and dispute process for operator rewards are not yet locked.
4. Pause controls exist, but the emergency decision path and post-incident unpause path are not yet governed and documented tightly enough.

### 2.4 Operations

1. The repo has health, status, metrics, admin overview, and monitoring guidance, but it still needs real alert routing, escalation ownership, and incident rotation.
2. Backup and restore assumptions for PostgreSQL and Redis need live drills, not only documentation.
3. Deployment rollback procedures need to be proven in a staging environment that mirrors the hosted topology.

### 2.5 Product and Commercial

1. Pricing is credible for devnet launch, but not mature enough yet for irreversible paid commitments.
2. Team collaboration, member roles, and support workflows now exist for the devnet product, but the governance, audit, and operational model for broader paid adoption still needs to mature.
3. SLA language is intentionally absent today. That is correct, but it also means paid launch should wait until support and incident expectations are defined.

## 3. Honest Launch Sequencing

The current codebase supports an honest staged rollout path.

1. Current devnet state
   Fyxvo is live on devnet with real SOL funding, wallet auth, funded gateway access, analytics, managed operator visibility, and hosted status surfaces.
2. Private alpha
   Invite a small set of known developers to use the hosted devnet stack with direct founder support, active monitoring, and manual issue triage.
3. Public devnet
   Open self-serve devnet usage more broadly once alerting, operator visibility, and support workflows are stable under real external traffic.
4. Mainnet prep
   Freeze protocol changes, move authorities to governed control, finalize treasury policy, rehearse backups and rollback, and stage the full hosted flow against mainnet-like infrastructure.
5. Mainnet beta
   Launch with tightly limited access, explicit no-SLA or light-SLA positioning, managed operator supply only, and conservative pricing while treasury and support procedures prove out.
6. Paid launch
   Open paid usage only after governance, treasury operations, monitoring, rate-limit policy, support workflows, and reconciliation are all treated as production disciplines rather than founder memory.

## 4. Must Be Complete Before Paid Mainnet Launch

These are the hard gates, not nice-to-haves.

1. Move upgrade authority and protocol admin authority to a governed signer or multisig.
2. Finalize accepted-asset policy and validate the real production mint configuration.
3. Add and audit the fee withdrawal and treasury reconciliation path.
4. Define data retention, redaction, and operational audit logging policies.
5. Run staging drills for deposit, gateway billing, worker rollups, reward snapshots, incident response, backup restore, and rollback.
6. Define the support model, incident ownership, and public positioning for uptime expectations.

## 5. What Is Intentionally Limited Today

These limits are deliberate and should stay explicit in product and docs.

1. SOL is the live public funding path on devnet.
2. USDC remains configuration-gated until it is deliberately enabled and fully validated.
3. The operator path is managed infrastructure first, not open decentralized supply.
4. Project collaboration is now multi-user, but it is still intentionally lightweight compared with the governed permission and approval model that paid mainnet operations will require.
5. The current launch is devnet-first and should be positioned that way until the mainnet gates above are closed.
