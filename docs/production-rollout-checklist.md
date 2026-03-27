# Production Rollout Checklist

Use this checklist after important releases so the live platform matches the repository and database state.

## Deploy confirmation

- [ ] Confirm `main` contains the intended release commit.
- [ ] Verify Vercel production is serving the latest frontend commit.
- [ ] Verify Railway `fyxvo-api` is serving the latest API commit.
- [ ] Verify Railway `fyxvo-gateway` is serving the latest gateway commit.
- [ ] Verify Railway `fyxvo-worker` is serving the latest worker commit.

## Database and migrations

- [ ] Run production migrations with `pnpm --filter @fyxvo/database exec prisma migrate deploy`.
- [ ] Confirm `prisma migrate deploy` reports no pending migrations.
- [ ] Verify the database schema matches the live application expectations before smoke testing.

## Health and routing checks

- [ ] Run `pnpm prod:verify` and confirm the live web, API, gateway, and assistant surfaces all pass.
- [ ] Check `https://api.fyxvo.com/health`.
- [ ] Check `https://api.fyxvo.com/v1/status`.
- [ ] Check `https://rpc.fyxvo.com/health`.
- [ ] Check `https://rpc.fyxvo.com/v1/status`.
- [ ] Verify public domains resolve to the correct services: `www.fyxvo.com`, `api.fyxvo.com`, `rpc.fyxvo.com`, and `status.fyxvo.com`.

## Assistant verification

- [ ] If assistant support is enabled, confirm `assistantAvailable` is `true` on both API health and status payloads.
- [ ] Run one authenticated browser smoke test on `/assistant` after releases that touch assistant, auth, streaming, or database models.

## Final browser check

- [ ] Open the live frontend and verify the latest UI is actually being served, not a stale deployment.
- [ ] Run one authenticated browser smoke test through the most important flow touched by the release.
