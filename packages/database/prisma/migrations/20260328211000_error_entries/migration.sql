CREATE TABLE IF NOT EXISTS "ErrorEntry" (
  "id" UUID NOT NULL,
  "route" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "message" TEXT NOT NULL,
  "stack" TEXT,
  "userAgent" TEXT,
  "requestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErrorEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ErrorEntry_createdAt_idx"
  ON "ErrorEntry"("createdAt");

CREATE INDEX IF NOT EXISTS "ErrorEntry_statusCode_createdAt_idx"
  ON "ErrorEntry"("statusCode", "createdAt");

CREATE INDEX IF NOT EXISTS "ErrorEntry_route_createdAt_idx"
  ON "ErrorEntry"("route", "createdAt");
