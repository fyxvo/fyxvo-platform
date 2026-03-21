-- CreateTable StatusSubscriber
CREATE TABLE "StatusSubscriber" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatusSubscriber_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StatusSubscriber_email_key" ON "StatusSubscriber"("email");
CREATE INDEX "StatusSubscriber_active_idx" ON "StatusSubscriber"("active");

-- CreateTable WebhookDelivery
CREATE TABLE "WebhookDelivery" (
    "id" UUID NOT NULL,
    "webhookId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WebhookDelivery_webhookId_idx" ON "WebhookDelivery"("webhookId");
CREATE INDEX "WebhookDelivery_status_nextRetryAt_idx" ON "WebhookDelivery"("status", "nextRetryAt");
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable PerformanceMetric
CREATE TABLE "PerformanceMetric" (
    "id" UUID NOT NULL,
    "pathname" TEXT NOT NULL,
    "fcp" DOUBLE PRECISION,
    "lcp" DOUBLE PRECISION,
    "tti" DOUBLE PRECISION,
    "ua" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PerformanceMetric_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PerformanceMetric_pathname_createdAt_idx" ON "PerformanceMetric"("pathname", "createdAt");

-- AlterTable Webhook (add StatusSubscriber to migration.lock)
