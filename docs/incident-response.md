# Incident Response Runbook

**Version:** 1.0
**Owner:** Fyxvo Core Team
**Last updated:** March 2026

This is the operational runbook for responding to Fyxvo production incidents. It is written to be usable at 2am by a tired founder who needs to make fast, correct decisions. Keep it up to date.

---

## Severity Levels

| Level | Definition | Response Time | Examples |
|-------|-----------|---------------|---------|
| **P0 Critical** | Complete service outage or data loss | Immediate — drop everything | Gateway down, database down, smart contract exploit |
| **P1 High** | Major degradation affecting most users | Within 30 minutes | >25% error rate, auth broken, funding flow broken |
| **P2 Medium** | Partial degradation, workaround exists | Within 2 hours | Analytics down, webhooks not delivering, single feature broken |
| **P3 Low** | Minor issue, minimal user impact | Within 24 hours | Slow queries, UI rendering issue, cosmetic bug |

---

## First Five Minutes

1. **Confirm the incident.** Check status.fyxvo.com, Railway dashboard, and Vercel. Is this real or a false alarm?
2. **Identify the component.** API? Gateway? Database? Smart contract? Frontend?
3. **Assign severity** using the table above.
4. **Post to Discord #incidents**: "🔴 Investigating [component] issue — [timestamp]". Do not wait until you have a fix.
5. **Open Railway logs** for the affected service. Look for the first error.

---

## Gateway Outage (P0/P1)

**Symptoms:** `rpc.fyxvo.com` returning 5xx, connection refused, or hanging.

**Steps:**
1. Open Railway → `fyxvo-gateway` service → Deployments tab.
2. Check logs for crash reason. Common causes:
   - Redis connection lost → restart gateway after Redis recovers
   - OOM crash → check memory in Railway metrics → scale up if needed
   - Environment variable missing → check Variables tab
3. **Quick restart:** Click "Redeploy" on the current deployment in Railway.
4. **Test recovery:** `curl -s https://rpc.fyxvo.com/ | jq .status` should return `"ok"`.
5. **If restart doesn't fix it:** Roll back to the previous deployment.

**Rollback:**
- Railway → `fyxvo-gateway` → Deployments → click the previous successful deployment → "Rollback to this deployment".

**Post to Discord** once service is restored: "✅ Gateway is back — [timestamp]. Root cause: [brief]."

---

## API Outage (P0/P1)

**Symptoms:** `api.fyxvo.com` returning 5xx, authentication failing, or endpoints hanging.

**Steps:**
1. Open Railway → `fyxvo-api` service → Deployments tab.
2. Check logs. Common causes:
   - Database connection pool exhausted → check `fyxvo-postgres` service
   - Redis connection lost → check `fyxvo-redis` service
   - Out of memory → scale up dyno
   - Bad deployment → roll back
3. **Test database:** Open Railway → `fyxvo-postgres` → Connect → run `SELECT 1;`. If this hangs, database is the problem.
4. **Test Redis:** `redis-cli -u $REDIS_URL PING`. Should return `PONG`.
5. **Quick restart:** Redeploy current `fyxvo-api` deployment in Railway.
6. **Rollback:** Same procedure as gateway — use previous successful deployment.

**Verify recovery:**
```bash
curl -s https://api.fyxvo.com/health | jq .
```
Should show `status: "ok"` with all dependencies green.

---

## Database Failure (P0)

**Symptoms:** API returning `500 database_error`, connection timeouts, Railway postgres service showing red.

**Steps:**
1. Check Railway → `fyxvo-postgres` service health. Is the service itself running?
2. Check Railway postgres metrics: CPU, memory, connection count.
3. **If connection pool exhausted:** Restart the API service to reset connections. Reduce `DATABASE_POOL_SIZE` if needed.
4. **If postgres service is down:** Wait for Railway auto-recovery (usually < 5 minutes). If not, contact Railway support.
5. **If data loss is suspected:** Check Railway → `fyxvo-postgres` → Backups. Do not run migrations or restore without understanding what happened first.

**Communications:**
- Post P0 update to Discord immediately.
- Use the in-app announcement system once the API is partially up:
  ```bash
  curl -X POST https://api.fyxvo.com/v1/admin/announcements \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"message":"Database maintenance in progress. Read operations may be slow.","severity":"warning"}'
  ```

---

## Smart Contract Anomaly (P0)

**Symptoms:** Treasury balance unexpectedly low, funding transactions not being credited, unusual on-chain activity.

**Steps:**
1. Check on-chain state immediately: `solana balance Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc --url devnet`
2. Check treasury account: known PDA for treasury.
3. **If exploit is suspected — pause the protocol immediately:**
   ```bash
   # Using Anchor CLI with admin keypair
   anchor run pause --provider.cluster devnet
   ```
   This prevents new project registrations and funding until the issue is understood.
4. **Halt the funding flow:** Disable `POST /v1/projects/:id/funding/prepare` by setting `FUNDING_DISABLED=true` in Railway environment variables.
5. Document all suspicious transactions with signatures.
6. Contact Solana security team if exploit appears novel.

**Note:** Devnet SOL has no real monetary value. A smart contract anomaly on devnet is serious for correctness but not a user funds emergency.

---

## Posting a Status Update

**Use the in-app announcement banner** for authenticated users:
```bash
curl -X POST https://api.fyxvo.com/v1/admin/announcements \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"We are investigating elevated latency on the relay gateway. Updates in Discord.","severity":"warning"}'
```

**Clear the banner once resolved:**
```bash
curl -X DELETE https://api.fyxvo.com/v1/admin/announcements/active \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Discord updates** — post in `#incidents` channel:
- **Initial:** 🔴 Investigating [issue] starting at [time UTC].
- **Update:** 🟡 Identified root cause: [brief]. Fix in progress. ETA [time].
- **Resolved:** ✅ Resolved at [time UTC]. [Brief root cause]. Post-mortem to follow.

---

## Railway Deployment Rollback

1. Open [railway.app](https://railway.app) → your project.
2. Click the service you need to roll back (api, gateway, worker).
3. Go to the **Deployments** tab.
4. Find the last known-good deployment (green checkmark).
5. Click the three-dot menu → **Rollback to this deployment**.
6. Railway will redeploy from the previous image. This takes about 60 seconds.

---

## Pausing the Anchor Program

If a critical bug is found in the on-chain program, you can pause protocol interactions:

```bash
# Verify your admin keypair
solana address --keypair ~/.config/solana/id.json
# Expected: AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem

# Run the pause instruction
anchor run pause --provider.cluster devnet --provider.wallet ~/.config/solana/id.json
```

Document the decision before running this — it affects all active projects.

---

## Updating the Status Page

The status page at `status.fyxvo.com` reflects live data from the `ServiceHealthSnapshot` table. It is updated automatically by the worker.

To manually add an incident to the incident history, insert directly into the database:
```sql
INSERT INTO "Incident" (id, "serviceName", severity, description, "startedAt")
VALUES (gen_random_uuid(), 'gateway', 'degraded', 'Gateway elevated error rate', NOW());
```

To resolve it:
```sql
UPDATE "Incident" SET "resolvedAt" = NOW() WHERE "resolvedAt" IS NULL AND "serviceName" = 'gateway';
```

---

## Post-Incident Review

For P0 and P1 incidents, write a brief post-mortem within 48 hours:

1. **What happened** — timeline with exact timestamps
2. **Root cause** — the actual technical reason, not the symptom
3. **Impact** — how many users were affected, for how long
4. **What we did** — steps taken to resolve
5. **What we will fix** — specific action items with owners and dates
6. **What went well** — things that helped us recover faster

Post the post-mortem to Discord `#incidents` and link it from the status page incident record.

---

## Contacts and Resources

| Resource | URL |
|----------|-----|
| Railway Dashboard | https://railway.app |
| Status Page | https://status.fyxvo.com |
| Discord | https://discord.gg/Uggu236Jgj |
| Solana Explorer (devnet) | https://explorer.solana.com/?cluster=devnet |
| GitHub | https://github.com/fyxvo/fyxvo-platform |

---

*Keep this document updated after every incident. The best runbook is the one that reflects what you actually did, not what you planned to do.*
