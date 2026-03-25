CREATE TABLE IF NOT EXISTS "DigestRecord" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "generatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "htmlContent" TEXT NOT NULL,
  "sent" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "DigestRecord_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "DigestRecord" ADD CONSTRAINT "DigestRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
