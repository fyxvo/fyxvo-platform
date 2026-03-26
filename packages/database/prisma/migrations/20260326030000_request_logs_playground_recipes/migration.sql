ALTER TABLE "RequestLog"
  ADD COLUMN IF NOT EXISTS "mode" TEXT,
  ADD COLUMN IF NOT EXISTS "simulated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "cacheHit" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "fyxvoHint" JSONB;

CREATE INDEX IF NOT EXISTS "RequestLog_projectId_mode_createdAt_idx"
  ON "RequestLog"("projectId", "mode", "createdAt");

CREATE INDEX IF NOT EXISTS "RequestLog_projectId_statusCode_createdAt_idx"
  ON "RequestLog"("projectId", "statusCode", "createdAt");

CREATE TABLE IF NOT EXISTS "PlaygroundRecipe" (
  "id" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'standard',
  "simulationEnabled" BOOLEAN NOT NULL DEFAULT false,
  "params" JSONB NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlaygroundRecipe_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlaygroundRecipe_projectId_updatedAt_idx"
  ON "PlaygroundRecipe"("projectId", "updatedAt");

CREATE INDEX IF NOT EXISTS "PlaygroundRecipe_projectId_method_idx"
  ON "PlaygroundRecipe"("projectId", "method");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PlaygroundRecipe_projectId_fkey'
  ) THEN
    ALTER TABLE "PlaygroundRecipe"
      ADD CONSTRAINT "PlaygroundRecipe_projectId_fkey"
      FOREIGN KEY ("projectId")
      REFERENCES "Project"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
