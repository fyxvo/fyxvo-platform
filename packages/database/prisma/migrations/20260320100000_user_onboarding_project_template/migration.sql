-- Add onboarding dismissed flag to User
ALTER TABLE "User" ADD COLUMN "onboardingDismissed" BOOLEAN NOT NULL DEFAULT false;

-- Add template type and archive support to Project
ALTER TABLE "Project" ADD COLUMN "templateType" TEXT;
ALTER TABLE "Project" ADD COLUMN "archivedAt" TIMESTAMP(3);
