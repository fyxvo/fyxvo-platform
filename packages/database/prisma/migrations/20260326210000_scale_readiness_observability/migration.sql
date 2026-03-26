ALTER TABLE "Project"
ADD COLUMN "dailyBudgetLamports" BIGINT,
ADD COLUMN "monthlyBudgetLamports" BIGINT,
ADD COLUMN "budgetWarningThresholdPct" INTEGER DEFAULT 80,
ADD COLUMN "budgetHardStop" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "IncidentUpdate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "incidentId" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'update',
  "severity" TEXT,
  "message" TEXT NOT NULL,
  "affectedServices" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentUpdate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "IncidentUpdate"
ADD CONSTRAINT "IncidentUpdate_incidentId_fkey"
FOREIGN KEY ("incidentId") REFERENCES "Incident"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "IncidentUpdate_incidentId_createdAt_idx" ON "IncidentUpdate"("incidentId", "createdAt");
CREATE INDEX "IncidentUpdate_status_createdAt_idx" ON "IncidentUpdate"("status", "createdAt");
