ALTER TABLE "AssistantMessage"
ADD COLUMN "projectId" UUID,
ADD COLUMN "matchedDocsSection" TEXT,
ADD COLUMN "suggestedActions" JSONB,
ADD COLUMN "playgroundPayload" JSONB,
ADD COLUMN "promptCategory" TEXT,
ADD COLUMN "responseTimeMs" INTEGER,
ADD COLUMN "inputTokenEstimate" INTEGER,
ADD COLUMN "outputTokenEstimate" INTEGER;

CREATE INDEX "AssistantMessage_projectId_idx"
ON "AssistantMessage"("projectId");

CREATE INDEX "AssistantMessage_matchedDocsSection_idx"
ON "AssistantMessage"("matchedDocsSection");

ALTER TABLE "AssistantMessage"
ADD CONSTRAINT "AssistantMessage_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AssistantFeedback" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "rating" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssistantFeedback_messageId_key"
ON "AssistantFeedback"("messageId");

CREATE INDEX "AssistantFeedback_conversationId_createdAt_idx"
ON "AssistantFeedback"("conversationId", "createdAt");

CREATE INDEX "AssistantFeedback_userId_createdAt_idx"
ON "AssistantFeedback"("userId", "createdAt");

CREATE INDEX "AssistantFeedback_rating_createdAt_idx"
ON "AssistantFeedback"("rating", "createdAt");

ALTER TABLE "AssistantFeedback"
ADD CONSTRAINT "AssistantFeedback_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistantFeedback"
ADD CONSTRAINT "AssistantFeedback_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistantFeedback"
ADD CONSTRAINT "AssistantFeedback_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "AssistantMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
