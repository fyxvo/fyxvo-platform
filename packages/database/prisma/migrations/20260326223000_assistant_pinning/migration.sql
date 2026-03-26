ALTER TABLE "AssistantConversation"
ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "AssistantConversation_userId_pinned_lastMessageAt_idx"
ON "AssistantConversation"("userId", "pinned", "lastMessageAt");
