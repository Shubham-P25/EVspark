-- AlterTable Session
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Session_externalId_key" ON "Session"("externalId");
