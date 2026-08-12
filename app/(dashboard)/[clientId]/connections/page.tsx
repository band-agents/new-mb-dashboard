import { headers } from "next/headers";
import { requireClientInScope } from "@/lib/data/scope";
import { prisma } from "@/lib/prisma";
import { isMetaConfigured, isShopifyConfigured } from "@/lib/env";
import { getTikTokAppConfigSummary, isTikTokConfiguredForOrg } from "@/lib/tiktok/appConfig";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectionCard } from "../account/connection-card";
import { ShopifyConnectionCard } from "../account/shopify-connection-card";
import { TikTokAppConfigCard } from "./tiktok-app-config-card";
import { TikTokConnectionCard } from "./tiktok-connection-card";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";

// Dedicated hub for all data-source connections (Meta, TikTok, Shopify).
// TikTok is two cards on purpose: TikTokAppConfigCard is app-level
// (Client ID/Secret/Redirect URI — entered once by the org owner, never by
// a client) and TikTokConnectionCard is per-client, OAuth-only (the client
// only ever sees "Connect TikTok Ads" and, if applicable, a list of their
// own advertiser accounts to pick from — never a credential field).
export default async function ConnectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{
    error?: string;
    connected?: string;
    shopifyError?: string;
    shopifyConnected?: string;
    tiktokError?: string;
    tiktokConnected?: string;
    tiktokSelectAdvertiser?: string;
  }>;
}) {
  const { clientId } = await params;
  const { client, session } = await requireClientInScope(clientId);
  const sp = await searchParams;
  const locale = await getLocale();

  const adAccounts = await prisma.adAccount.findMany({ where: { clientId } });
  const shopifyConnection = await prisma.shopifyConnection.findUnique({ where: { clientId } });
  const tiktokConnection = await prisma.tikTokConnection.findUnique({ where: { clientId } });
  const pendingAdvertisers: { advertiser_id: string; advertiser_name: string }[] = tiktokConnection?.pendingAdvertisersJson
    ? JSON.parse(tiktokConnection.pendingAdvertisersJson)
    : [];

  const [tiktokAppSummary, tiktokAppConfigured] = await Promise.all([
    getTikTokAppConfigSummary(session.user.organizationId),
    isTikTokConfiguredForOrg(session.user.organizationId),
  ]);

  // Best-effort default the owner can start from when entering the
  // Redirect URI for the first time — must match the actual deployment
  // origin (the OAuth callback route lives at exactly this path), so it's
  // derived from the real incoming request rather than a possibly-stale
  // env var.
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const suggestedRedirectUri = `${proto}://${host}/api/tiktok/oauth/callback`;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold">{t(locale, "nav.connections")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "connections.subtitle", { client: client.name })}</p>

      <div className="space-y-4">
        <ConnectionCard
          clientId={clientId}
          status={client.metaConnection?.status ?? "NOT_CONNECTED"}
          isMetaConfigured={isMetaConfigured()}
          lastSyncedAt={client.metaConnection?.lastSyncedAt?.toISOString() ?? null}
          lastError={client.metaConnection?.lastError ?? null}
          error={sp.error}
        />

        <TikTokAppConfigCard
          clientId={clientId}
          isOwner={session.user.role === "OWNER"}
          summary={tiktokAppSummary}
          suggestedRedirectUri={suggestedRedirectUri}
        />

        <TikTokConnectionCard
          clientId={clientId}
          status={tiktokConnection?.status ?? "NOT_CONNECTED"}
          isTikTokConfigured={tiktokAppConfigured}
          advertiserName={tiktokConnection?.advertiserName ?? null}
          advertiserCurrency={tiktokConnection?.advertiserCurrency ?? null}
          pendingAdvertisers={pendingAdvertisers}
          lastSyncedAt={tiktokConnection?.lastSyncedAt?.toISOString() ?? null}
          lastError={tiktokConnection?.lastError ?? null}
          error={sp.tiktokError}
        />

        <ShopifyConnectionCard
          clientId={clientId}
          status={shopifyConnection?.status ?? "NOT_CONNECTED"}
          isShopifyConfigured={isShopifyConfigured()}
          lastSyncedAt={shopifyConnection?.lastSyncedAt?.toISOString() ?? null}
          lastError={shopifyConnection?.lastError ?? null}
          error={sp.shopifyError}
        />

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">{t(locale, "account.adAccountsTitle")}</h2>
          {adAccounts.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t(locale, "account.noAdAccounts")}</p>
          ) : (
            <ul className="space-y-2">
              {adAccounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium">{a.name}</p>
                      <Badge variant="outline">{a.adPlatform === "TIKTOK" ? "TikTok" : "Meta"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.externalAccountId} · {a.currency}</p>
                  </div>
                  <Badge variant={a.status === "ACTIVE" ? "positive" : "neutral"}>{a.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
