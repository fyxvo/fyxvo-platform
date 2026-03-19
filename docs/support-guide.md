# Support Guide

## 1. Support entry points

Fyxvo uses product-owned support paths during the private alpha.

1. The interest form on the contact and pricing pages is for rollout fit, founder follow-up, expected traffic, and use-case review.
2. The feedback form is for bugs, onboarding friction, and support requests.
3. Discord and Telegram are useful for lightweight coordination, but product issues should still be captured through the form so they land in the admin review queue.

## 2. What users should submit

Useful support reports include:

1. The page or flow where the issue occurred.
2. Whether the wallet session was already authenticated.
3. Whether the project was already activated.
4. Whether the project was already funded with SOL.
5. Whether the problem blocked API key creation or the first relay request.

## 3. Admin review flow

The secure admin overview exposes:

1. Recent feedback and support submissions.
2. Recent project activity.
3. Recent funding activity.
4. Recent API key activity.
5. Launch funnel signals.
6. Worker freshness, protocol readiness, and treasury posture.

That gives the alpha team one place to review both direct user feedback and the surrounding operational context.

The practical review split is:

1. Interest queue: use case, expected volume, priority-path need, operator interest, source, and current status.
2. Feedback queue: category, page, project context, and whether the issue is support, onboarding, or product quality.

## 4. Suggested response discipline

1. Acknowledge whether the issue is product friction, operator health, funding state, or key-scope misuse.
2. Check status surfaces before asking the user to retry.
3. Check project activation and funding state before debugging relay traffic.
4. Keep responses honest about what is live, what is managed, and what is still gated.

Useful founder follow-up notes are:

1. Review owner.
2. Team and workload summary.
3. Expected request volume.
4. Whether standard RPC, priority relay, analytics, or operator conversation is the main ask.
5. First blocker.
6. Next action and follow-up date.

## 5. Escalation guidance

Escalate internally when:

1. Funding verification fails after the wallet shows a confirmed devnet transaction.
2. A project has spendable balance but the gateway still rejects funded access.
3. The status surface and admin overview disagree on protocol readiness.
4. Multiple teams report the same onboarding friction within a short window.
