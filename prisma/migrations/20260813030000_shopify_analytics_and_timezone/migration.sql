-- AlterTable: AdAccount.timezone honest default (existing rows keep their
-- current value; corrected the next time each account re-syncs and the
-- sync code actually populates a real value).
ALTER TABLE "AdAccount" ALTER COLUMN "timezone" SET DEFAULT 'UTC';

-- AlterTable: ShopifyConnection gains a nullable timezone column.
ALTER TABLE "ShopifyConnection" ADD COLUMN "timezone" TEXT;

-- AlterTable: ShopifyOrderSnapshot gains order-status breakdown counts.
ALTER TABLE "ShopifyOrderSnapshot" ADD COLUMN "paidOrders" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ShopifyOrderSnapshot" ADD COLUMN "fulfilledOrders" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ShopifyOrderSnapshot" ADD COLUMN "cancelledOrders" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ShopifyOrderSnapshot" ADD COLUMN "refundedOrders" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ShopifyProductSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "externalProductId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unitsSold" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source" TEXT NOT NULL DEFAULT 'LIVE',

    CONSTRAINT "ShopifyProductSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopifyProductSnapshot_clientId_date_idx" ON "ShopifyProductSnapshot"("clientId", "date");
CREATE INDEX "ShopifyProductSnapshot_clientId_externalProductId_idx" ON "ShopifyProductSnapshot"("clientId", "externalProductId");

-- AddForeignKey
ALTER TABLE "ShopifyProductSnapshot" ADD CONSTRAINT "ShopifyProductSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ShopifyCustomer" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "externalCustomerId" TEXT NOT NULL,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstOrderAt" TIMESTAMP(3),
    "lastOrderAt" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',

    CONSTRAINT "ShopifyCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyCustomer_clientId_externalCustomerId_key" ON "ShopifyCustomer"("clientId", "externalCustomerId");
CREATE INDEX "ShopifyCustomer_clientId_idx" ON "ShopifyCustomer"("clientId");

-- AddForeignKey
ALTER TABLE "ShopifyCustomer" ADD CONSTRAINT "ShopifyCustomer_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ShopifyCheckoutSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "abandonedCount" INTEGER NOT NULL DEFAULT 0,
    "abandonedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source" TEXT NOT NULL DEFAULT 'LIVE',

    CONSTRAINT "ShopifyCheckoutSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopifyCheckoutSnapshot_clientId_date_idx" ON "ShopifyCheckoutSnapshot"("clientId", "date");

-- AddForeignKey
ALTER TABLE "ShopifyCheckoutSnapshot" ADD CONSTRAINT "ShopifyCheckoutSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
