-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "defaultDateRange" TEXT NOT NULL DEFAULT 'last_30_days',
    "emailAlerts" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "avatarHue" INTEGER NOT NULL DEFAULT 210,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MetaConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
    "accessTokenEnc" TEXT,
    "tokenExpiresAt" DATETIME,
    "scopes" TEXT,
    "metaUserId" TEXT,
    "lastSyncedAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MetaConnection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "metaAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    CONSTRAINT "AdAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adAccountId" TEXT NOT NULL,
    "metaCampaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "dailyBudget" REAL,
    "lifetimeBudget" REAL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    CONSTRAINT "Campaign_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "metaAdSetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dailyBudget" REAL,
    "optimizationGoal" TEXT NOT NULL DEFAULT 'CONVERSIONS',
    "targetingSummary" TEXT NOT NULL,
    CONSTRAINT "AdSet_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adSetId" TEXT NOT NULL,
    "metaAdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "Ad_adSetId_fkey" FOREIGN KEY ("adSetId") REFERENCES "AdSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Creative" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "callToAction" TEXT NOT NULL DEFAULT 'LEARN_MORE',
    CONSTRAINT "Creative_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InsightSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "level" TEXT NOT NULL,
    "adAccountId" TEXT,
    "campaignId" TEXT,
    "adSetId" TEXT,
    "adId" TEXT,
    "placement" TEXT,
    "device" TEXT,
    "ageRange" TEXT,
    "gender" TEXT,
    "region" TEXT,
    "platform" TEXT,
    "spend" REAL NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "frequency" REAL NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "linkClicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "conversionValue" REAL NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "addToCart" INTEGER NOT NULL DEFAULT 0,
    "initiateCheckout" INTEGER NOT NULL DEFAULT 0,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "viewContent" INTEGER NOT NULL DEFAULT 0,
    "registrations" INTEGER NOT NULL DEFAULT 0,
    "engagement" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'DEMO',
    CONSTRAINT "InsightSnapshot_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InsightSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InsightSnapshot_adSetId_fkey" FOREIGN KEY ("adSetId") REFERENCES "AdSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InsightSnapshot_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateRangeStart" DATETIME NOT NULL,
    "dateRangeEnd" DATETIME NOT NULL,
    "campaignIds" TEXT NOT NULL,
    "metrics" TEXT NOT NULL,
    "breakdown" TEXT,
    "comparisonPeriod" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "changePercent" REAL,
    "affectedEntityType" TEXT NOT NULL,
    "affectedEntityId" TEXT,
    "affectedEntityName" TEXT NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Alert_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "Client_organizationId_idx" ON "Client"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MetaConnection_clientId_key" ON "MetaConnection"("clientId");

-- CreateIndex
CREATE INDEX "AdAccount_clientId_idx" ON "AdAccount"("clientId");

-- CreateIndex
CREATE INDEX "Campaign_adAccountId_idx" ON "Campaign"("adAccountId");

-- CreateIndex
CREATE INDEX "AdSet_campaignId_idx" ON "AdSet"("campaignId");

-- CreateIndex
CREATE INDEX "Ad_adSetId_idx" ON "Ad"("adSetId");

-- CreateIndex
CREATE UNIQUE INDEX "Creative_adId_key" ON "Creative"("adId");

-- CreateIndex
CREATE INDEX "InsightSnapshot_campaignId_date_idx" ON "InsightSnapshot"("campaignId", "date");

-- CreateIndex
CREATE INDEX "InsightSnapshot_adSetId_date_idx" ON "InsightSnapshot"("adSetId", "date");

-- CreateIndex
CREATE INDEX "InsightSnapshot_adId_date_idx" ON "InsightSnapshot"("adId", "date");

-- CreateIndex
CREATE INDEX "InsightSnapshot_adAccountId_date_idx" ON "InsightSnapshot"("adAccountId", "date");

-- CreateIndex
CREATE INDEX "ReportConfig_clientId_idx" ON "ReportConfig"("clientId");

-- CreateIndex
CREATE INDEX "Alert_clientId_date_idx" ON "Alert"("clientId", "date");
