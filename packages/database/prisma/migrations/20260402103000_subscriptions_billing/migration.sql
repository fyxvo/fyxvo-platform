-- Add relay pause flag so overdue subscriptions can suspend gateway access.
ALTER TABLE "Project"
ADD COLUMN "relayPaused" BOOLEAN NOT NULL DEFAULT false;

-- Create per-project subscription record for automatic billing.
CREATE TABLE "Subscription" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "plan" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "priceUsdc" BIGINT NOT NULL,
  "requestsIncluded" BIGINT NOT NULL,
  "priorityRequestsIncluded" BIGINT NOT NULL,
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Subscription_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Subscription_plan_check" CHECK ("plan" IN ('starter', 'builder', 'scale', 'growth', 'business', 'network', 'payperrequest')),
  CONSTRAINT "Subscription_status_check" CHECK ("status" IN ('active', 'paused', 'cancelled', 'overdue'))
);

CREATE UNIQUE INDEX "Subscription_projectId_key" ON "Subscription"("projectId");
CREATE INDEX "Subscription_status_currentPeriodEnd_idx" ON "Subscription"("status", "currentPeriodEnd");
CREATE INDEX "Subscription_plan_status_idx" ON "Subscription"("plan", "status");
