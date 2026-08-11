import { requireClientInScope } from "@/lib/data/scope";
import { prisma } from "@/lib/prisma";
import { isMetaConfigured, isShopifyConfigured, isTikTokConfigured } from "@/lib/env";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConnectionCard } from "./connection-card";
import { ShopifyConnectionCard } from "./shopify-connection-card";
import { TikTokConnectionCard } from "./tiktok-connection-card";
import { updateClientAction } from "./actions";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";

export default async function AccountPage({
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

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold">{t(locale, "account.title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "account.subtitle", { client: client.name })}</p>

      <div className="space-y-4">
        <ConnectionCard
          clientId={clientId}
          status={client.metaConnection?.status ?? "NOT_CONNECTED"}
          isMetaConfigured={isMetaConfigured()}
          lastSyncedAt={client.metaConnection?.lastSyncedAt?.toISOString() ?? null}
          lastError={client.metaConnection?.lastError ?? null}
          error={sp.error}
        />

        <ShopifyConnectionCard
          clientId={clientId}
          status={shopifyConnection?.status ?? "NOT_CONNECTED"}
          isShopifyConfigured={isShopifyConfigured()}
          lastSyncedAt={shopifyConnection?.lastSyncedAt?.toISOString() ?? null}
          lastError={shopifyConnection?.lastError ?? null}
          error={sp.shopifyError}
        />

        <TikTokConnectionCard
          clientId={clientId}
          status={tiktokConnection?.status ?? "NOT_CONNECTED"}
          isTikTokConfigured={isTikTokConfigured()}
          advertiserName={tiktokConnection?.advertiserName ?? null}
          advertiserCurrency={tiktokConnection?.advertiserCurrency ?? null}
          pendingAdvertisers={pendingAdvertisers}
          lastSyncedAt={tiktokConnection?.lastSyncedAt?.toISOString() ?? null}
          lastError={tiktokConnection?.lastError ?? null}
          error={sp.tiktokError}
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

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">{t(locale, "account.clientSettings")}</h2>
          <form action={updateClientAction.bind(null, clientId)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t(locale, "account.businessName")}</Label>
              <Input id="name" name="name" defaultValue={client.name} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="industry">{t(locale, "account.industry")}</Label>
              <Input id="industry" name="industry" defaultValue={client.industry ?? ""} />
            </div>
            <Button type="submit" size="sm">
              {t(locale, "common.saveChanges")}
            </Button>
          </form>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">{t(locale, "account.signedInAs")}</h2>
          <p className="text-sm">{session.user.name}</p>
          <p className="text-xs text-muted-foreground">{session.user.email} · {session.user.role}</p>
        </Card>
      </div>
    </div>
  );
}
