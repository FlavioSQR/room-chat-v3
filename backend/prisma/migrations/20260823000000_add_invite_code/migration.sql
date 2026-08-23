-- AlterTable
ALTER TABLE "Server" ADD COLUMN "inviteCode" TEXT;

-- Backfill any existing rows with a random code before enforcing NOT NULL/UNIQUE
UPDATE "Server" SET "inviteCode" = substr(md5(random()::text || "id"), 1, 8) WHERE "inviteCode" IS NULL;

-- AlterTable
ALTER TABLE "Server" ALTER COLUMN "inviteCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Server_inviteCode_key" ON "Server"("inviteCode");
