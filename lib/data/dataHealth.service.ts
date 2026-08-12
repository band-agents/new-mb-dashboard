// Consolidated Data Health check across every connected platform — a
// single, honest place that surfaces exactly what an audit demands:
// missing/stale data, connection errors, and currency mismatches between
// simultaneously-connected sources. Nothing here is inferred or guessed —
// every field is read directly from the same connection/account rows the
// rest of the app already trusts (MetaConnection, TikTokConnection,
// ShopifyConnection, AdAccount).

import { prisma } from "@/lib/prisma";

const STALE_AFTER_HOURS = 48;

export type PlatformCode = "META" | "TIKTOK" | "SHOPIFY";

export type PlatformHealth = {
  platform: PlatformCode;
  connected: boolean;
  hasError: boolean;
  lastError: string | null;
  lastSyncedAt: string | null; // ISO string, or null if never synced
  isStale: boolean; // connected, has synced before, but not within STALE_AFTER_HOURS
  currency: string | null;
};

export type DataHealthSummary = {
  platforms: PlatformHealth[];
  currencyMismatch: boolean; // 2+ connected platforms report different currencies
  hasAnyError: boolean;
  hasAnyStaleData: boolean;
  staleAfterHours: number;
};

function isStale(lastSyncedAt: Date | null): boolean {
  if (!lastSyncedAt) return false; // "never synced" is its own state, not "stale"
  return Date.now() - lastSyncedAt.getTime() > STALE_AFTER_HOURS * 60 * 60 * 1000;
}

export async function getDataHealthSummary(clientId: string): Promise<DataHealthSummary> {
  const [metaConnection, tiktokConnection, shopifyConnection, metaAccount, tiktokAccount] = await Promise.all([
    prisma.metaConnection.findUnique({ where: { clientId } }),
    prisma.tikTokConnection.findUnique({ where: { clientId } }),
    prisma.shopifyConnection.findUnique({ where: { clientId } }),
    prisma.adAccount.findFirst({ where: { clientId, adPlatform: "META" }, select: { currency: true } }),
    prisma.adAccount.findFirst({ where: { clientId, adPlatform: "TIKTOK" }, select: { currency: true } }),
  ]);

  const platforms: PlatformHealth[] = [
    {
      platform: "META",
      connected: metaConnection?.status === "CONNECTED",
      hasError: metaConnection?.status === "ERROR",
      lastError: metaConnection?.lastError ?? null,
      lastSyncedAt: metaConnection?.lastSyncedAt?.toISOString() ?? null,
      isStale: metaConnection?.status === "CONNECTED" ? isStale(metaConnection.lastSyncedAt) : false,
      currency: metaAccount?.currency ?? null,
    },
    {
      platform: "TIKTOK",
      connected: tiktokConnection?.status === "CONNECTED",
      hasError: tiktokConnection?.status === "ERROR",
      lastError: tiktokConnection?.lastError ?? null,
      lastSyncedAt: tiktokConnection?.lastSyncedAt?.toISOString() ?? null,
      isStale: tiktokConnection?.status === "CONNECTED" ? isStale(tiktokConnection.lastSyncedAt) : false,
      currency: tiktokAccount?.currency ?? null,
    },
    {
      platform: "SHOPIFY",
      connected: shopifyConnection?.status === "CONNECTED",
      hasError: shopifyConnection?.status === "ERROR",
      lastError: shopifyConnection?.lastError ?? null,
      lastSyncedAt: shopifyConnection?.lastSyncedAt?.toISOString() ?? null,
      isStale: shopifyConnection?.status === "CONNECTED" ? isStale(shopifyConnection.lastSyncedAt) : false,
      currency: shopifyConnection?.storeCurrency ?? null,
    },
  ];

  const connectedCurrencies = new Set(platforms.filter((p) => p.connected && p.currency).map((p) => p.currency));

  return {
    platforms,
    currencyMismatch: connectedCurrencies.size > 1,
    hasAnyError: platforms.some((p) => p.hasError),
    hasAnyStaleData: platforms.some((p) => p.isStale),
    staleAfterHours: STALE_AFTER_HOURS,
  };
}
