CREATE TABLE "DashboardPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "widgetOrder" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "hiddenWidgets" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedView" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" UUID,
    "filters" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserBookmark" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "projectId" UUID,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBookmark_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeedbackInboxTriage" (
    "id" UUID NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackInboxTriage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DashboardPreference_userId_key" ON "DashboardPreference"("userId");
CREATE UNIQUE INDEX "SavedView_userId_kind_name_key" ON "SavedView"("userId", "kind", "name");
CREATE UNIQUE INDEX "UserBookmark_userId_href_key" ON "UserBookmark"("userId", "href");
CREATE UNIQUE INDEX "FeedbackInboxTriage_itemType_itemId_key" ON "FeedbackInboxTriage"("itemType", "itemId");

CREATE INDEX "DashboardPreference_userId_idx" ON "DashboardPreference"("userId");
CREATE INDEX "SavedView_userId_kind_updatedAt_idx" ON "SavedView"("userId", "kind", "updatedAt");
CREATE INDEX "SavedView_userId_kind_isDefault_idx" ON "SavedView"("userId", "kind", "isDefault");
CREATE INDEX "SavedView_projectId_updatedAt_idx" ON "SavedView"("projectId", "updatedAt");
CREATE INDEX "UserBookmark_userId_updatedAt_idx" ON "UserBookmark"("userId", "updatedAt");
CREATE INDEX "UserBookmark_projectId_updatedAt_idx" ON "UserBookmark"("projectId", "updatedAt");
CREATE INDEX "FeedbackInboxTriage_status_updatedAt_idx" ON "FeedbackInboxTriage"("status", "updatedAt");
