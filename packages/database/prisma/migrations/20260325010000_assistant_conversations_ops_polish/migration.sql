-- Assistant conversations
CREATE TABLE "AssistantConversation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssistantMessage" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssistantConversation_userId_lastMessageAt_idx"
ON "AssistantConversation"("userId", "lastMessageAt");

CREATE INDEX "AssistantMessage_conversationId_createdAt_idx"
ON "AssistantMessage"("conversationId", "createdAt");

ALTER TABLE "AssistantConversation"
ADD CONSTRAINT "AssistantConversation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistantMessage"
ADD CONSTRAINT "AssistantMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Announcement scheduling
ALTER TABLE "SystemAnnouncement"
ADD COLUMN "startAt" TIMESTAMP(3),
ADD COLUMN "endAt" TIMESTAMP(3);

CREATE INDEX "SystemAnnouncement_active_startAt_endAt_idx"
ON "SystemAnnouncement"("active", "startAt", "endAt");

-- Support ticket admin response timing
ALTER TABLE "SupportTicket"
ADD COLUMN "adminRespondedAt" TIMESTAMP(3);
