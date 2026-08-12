-- CreateTable
CREATE TABLE "ShopifyAppConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretEnc" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyAppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyAppConfig_organizationId_key" ON "ShopifyAppConfig"("organizationId");

-- AddForeignKey
ALTER TABLE "ShopifyAppConfig" ADD CONSTRAINT "ShopifyAppConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
