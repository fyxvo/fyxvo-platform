ALTER TABLE "AssistantConversation"
ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "AssistantConversation_userId_archivedAt_pinned_lastMessageAt_idx"
ON "AssistantConversation"("userId", "archivedAt", "pinned", "lastMessageAt");
