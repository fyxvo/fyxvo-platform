-- Add enrichment fields to RequestLog
ALTER TABLE "RequestLog" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "RequestLog" ADD COLUMN IF NOT EXISTS "requestSize" INTEGER;
ALTER TABLE "RequestLog" ADD COLUMN IF NOT EXISTS "responseSize" INTEGER;
ALTER TABLE "RequestLog" ADD COLUMN IF NOT EXISTS "upstreamNode" TEXT;

CREATE INDEX IF NOT EXISTS "RequestLog_upstreamNode_idx" ON "RequestLog"("upstreamNode");

-- SupportTicket
CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "projectId" UUID,
  "category" TEXT NOT NULL DEFAULT 'general',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "adminResponse" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupportTicket_userId_idx" ON "SupportTicket"("userId");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- BlogPost
CREATE TABLE IF NOT EXISTS "BlogPost" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "visible" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BlogPost_slug_key" ON "BlogPost"("slug");
CREATE INDEX IF NOT EXISTS "BlogPost_visible_publishedAt_idx" ON "BlogPost"("visible", "publishedAt");
