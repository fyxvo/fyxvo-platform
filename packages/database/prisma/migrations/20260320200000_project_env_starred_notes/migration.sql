ALTER TABLE "Project" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'development';
ALTER TABLE "Project" ADD COLUMN "starred" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "notes" TEXT;
