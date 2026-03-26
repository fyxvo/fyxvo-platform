ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "notesUpdatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "notesEditedByWallet" TEXT;

ALTER TABLE "ApiKey"
  ADD COLUMN IF NOT EXISTS "colorTag" TEXT;

ALTER TABLE "PlaygroundRecipe"
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sharedToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "PlaygroundRecipe_sharedToken_key"
  ON "PlaygroundRecipe"("sharedToken");

CREATE INDEX IF NOT EXISTS "PlaygroundRecipe_projectId_pinned_updatedAt_idx"
  ON "PlaygroundRecipe"("projectId", "pinned", "updatedAt");

CREATE TABLE IF NOT EXISTS "AlertState" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "projectId" UUID,
  "alertKey" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'new',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AlertState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AlertState_userId_alertKey_key"
  ON "AlertState"("userId", "alertKey");

CREATE INDEX IF NOT EXISTS "AlertState_userId_state_updatedAt_idx"
  ON "AlertState"("userId", "state", "updatedAt");

CREATE INDEX IF NOT EXISTS "AlertState_projectId_updatedAt_idx"
  ON "AlertState"("projectId", "updatedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AlertState_userId_fkey'
  ) THEN
    ALTER TABLE "AlertState"
      ADD CONSTRAINT "AlertState_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AlertState_projectId_fkey'
  ) THEN
    ALTER TABLE "AlertState"
      ADD CONSTRAINT "AlertState_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
