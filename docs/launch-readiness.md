# Launch Readiness Checklist

Status key: COMPLETE | IN PROGRESS | NOT STARTED | N/A

---

## Security Requirements

- [x] Rate limiting on all public endpoints: COMPLETE (API rate limit plugin, per-route limits)
- [x] SSRF prevention on webhook URLs: COMPLETE (validateWebhookUrl blocks private ranges)
- [x] HMAC webhook signatures: COMPLETE (sha256= header on all webhook deliveries)
- [ ] JWT secret rotation mechanism: IN PROGRESS (sessionVersion increment supported, no UI yet)
- [x] API key scope enforcement: COMPLETE (gateway enforces rpc:request, priority:relay scopes)
- [x] SQL injection protection: COMPLETE (Prisma parameterized queries)
- [x] XSS protection: COMPLETE (CSP headers in Next.js config)
- [x] CORS restricted to known origins: COMPLETE (WEB_ORIGIN env var enforced)
- [ ] Secrets scanning in CI: NOT STARTED
- [ ] Penetration test: NOT STARTED
- [ ] SOC 2 Type I assessment: NOT STARTED (not required for devnet alpha)

---

## Reliability Requirements

- [ ] Database backups configured: CHECK RAILWAY (automated backups should be enabled)
- [ ] Redis persistence configured: IN PROGRESS (Railway Redis, check AOF/RDB)
- [x] Health checks for Railway deploy: COMPLETE (/health endpoint used by Railway)
- [ ] Graceful shutdown on SIGTERM: NOT STARTED (Fastify handles it but not explicitly coded)
- [x] Database connection pooling: COMPLETE (Prisma connection pool)
- [ ] Error rate monitoring: IN PROGRESS (ServiceHealthSnapshot table, no external alerting yet)
- [ ] Uptime monitoring: IN PROGRESS (status.fyxvo.com, no external uptime monitor)
- [ ] Recovery runbook: NOT STARTED

---

## Protocol Requirements

- [x] On-chain program deployed to devnet: COMPLETE (FQ5pyjBQvfadKPPxd66YXksgn8veYnjEw2R1g6aQnFaa)
- [x] SOL funding flow working: COMPLETE
- [ ] USDC funding flow: NOT STARTED (gated — requires USDC vault initialization)
- [ ] Mainnet program deployment: NOT STARTED
- [ ] Program audit: NOT STARTED (required before mainnet)
- [x] Treasury reconciliation: COMPLETE (admin overview shows on-chain vs DB balances)

---

## Product Requirements

- [x] Onboarding flow: COMPLETE (5-step modal)
- [ ] Error messages are user-friendly: IN PROGRESS (backend uses error codes, some are technical)
- [x] Mobile experience: COMPLETE (responsive, bottom nav on mobile)
- [ ] Docs completeness: IN PROGRESS (core flows documented, missing SDK deep-dive)
- [x] Terms of Service: COMPLETE (/terms)
- [x] Privacy Policy: COMPLETE (/privacy)
- [x] Cookie Policy: COMPLETE (/cookies)
- [x] Referral system: COMPLETE
- [ ] Email delivery for notifications: NOT STARTED (stored but not delivered)
- [ ] SDK published to npm: NOT STARTED (@fyxvo/sdk exists but not published)

---

## Legal Requirements

- [ ] Terms of Service reviewed by counsel: NOT STARTED
- [ ] Privacy Policy reviewed by counsel: NOT STARTED
- [ ] GDPR compliance review: NOT STARTED
- [x] US data residency: N/A (devnet alpha, no PII beyond wallet addresses and emails)

---

## Operational Requirements

- [ ] Incident response runbook: NOT STARTED
- [ ] On-call rotation defined: NOT STARTED (solo founder stage)
- [ ] Customer support channel: IN PROGRESS (Discord, Telegram)
- [x] Status page: COMPLETE (status.fyxvo.com)
- [x] Admin dashboard: COMPLETE (/dashboard admin view)
- [ ] Billing integration: NOT STARTED (SOL credits system exists but no fiat billing)
- [ ] Operator onboarding: IN PROGRESS (operator page exists, no self-serve yet)
