-- Renames (data-preserving) — these were drop+add in Prisma's auto-diff,
-- hand-written as renames instead so the already-synced live Meta data
-- (Ad/AdSet/Campaign/AdAccount rows) is not destroyed.
ALTER TABLE "Ad" RENAME COLUMN "metaAdId" TO "externalAdId";
ALTER TABLE "AdAccount" RENAME COLUMN "metaAccountId" TO "externalAccountId";
ALTER TABLE "AdSet" RENAME COLUMN "metaAdSetId" TO "externalAdSetId";
ALTER TABLE "Campaign" RENAME COLUMN "metaCampaignId" TO "externalCampaignId";

-- AddColumn: platform discriminator on AdAccount (existing rows default to META,
-- which is correct — every row synced so far came from Meta).
ALTER TABLE "AdAccount" ADD COLUMN "adPlatform" TEXT NOT NULL DEFAULT 'META';

-- AddColumn: nullable TikTok-only metrics on InsightSnapshot
ALTER TABLE "InsightSnapshot" ADD COLUMN "videoViews" INTEGER;
ALTER TABLE "InsightSnapshot" ADD COLUMN "likes" INTEGER;
ALTER TABLE "InsightSnapshot" ADD COLUMN "comments" INTEGER;
ALTER TABLE "InsightSnapshot" ADD COLUMN "shares" INTEGER;
ALTER TABLE "InsightSnapshot" ADD COLUMN "follows" INTEGER;

-- CreateTable
CREATE TABLE "TikTokConnection" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
    "accessTokenEnc" TEXT,
    "advertiserId" TEXT,
    "advertiserName" TEXT,
    "advertiserCurrency" TEXT,
    "scopes" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TikTokConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TikTokConnection_clientId_key" ON "TikTokConnection"("clientId");

-- CreateIndex
CREATE INDEX "AdAccount_clientId_adPlatform_idx" ON "AdAccount"("clientId", "adPlatform");

-- AddForeignKey
ALTER TABLE "TikTokConnection" ADD CONSTRAINT "TikTokConnection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
