ALTER TABLE "ProjectMember" ADD COLUMN IF NOT EXISTS "inviteToken" TEXT;
ALTER TABLE "ProjectMember" ADD COLUMN IF NOT EXISTS "inviteExpiry" TIMESTAMP(3);
ALTER TABLE "ProjectMember" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "ProjectMember" ALTER COLUMN "userId" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectMember_inviteToken_key" ON "ProjectMember"("inviteToken");

CREATE TABLE IF NOT EXISTS "DigestSchedule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "frequency" TEXT NOT NULL DEFAULT 'weekly',
  "lastSentAt" TIMESTAMP(3),
  "nextSendAt" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DigestSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DigestSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "DigestSchedule_userId_key" ON "DigestSchedule"("userId");
