-- CreateTable
CREATE TABLE "MainnetReleaseGate" (
    "id" UUID NOT NULL,
    "environment" TEXT NOT NULL,
    "targetReserveLamports" BIGINT NOT NULL DEFAULT 100000000000,
    "armed" BOOLEAN NOT NULL DEFAULT false,
    "armedAt" TIMESTAMP(3),
    "armedByUserId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MainnetReleaseGate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MainnetReleaseGate_environment_key" ON "MainnetReleaseGate"("environment");

-- CreateIndex
CREATE INDEX "MainnetReleaseGate_armed_updatedAt_idx" ON "MainnetReleaseGate"("armed", "updatedAt");

-- AddForeignKey
ALTER TABLE "MainnetReleaseGate" ADD CONSTRAINT "MainnetReleaseGate_armedByUserId_fkey" FOREIGN KEY ("armedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
