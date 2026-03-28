CREATE TABLE IF NOT EXISTS "OperatorRegistration" (
  "id" UUID NOT NULL,
  "endpoint" TEXT NOT NULL,
  "operatorWalletAddress" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "contact" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  CONSTRAINT "OperatorRegistration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OperatorRegistration_operatorWalletAddress_createdAt_idx"
  ON "OperatorRegistration"("operatorWalletAddress", "createdAt");

CREATE INDEX IF NOT EXISTS "OperatorRegistration_status_createdAt_idx"
  ON "OperatorRegistration"("status", "createdAt");
