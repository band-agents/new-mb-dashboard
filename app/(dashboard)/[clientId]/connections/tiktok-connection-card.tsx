"use client";

import { useTransition, useState } from "react";
import { CheckCircle2, Music2, RefreshCw, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { disconnectTikTokAction, resyncTikTokAction, selectTikTokAdvertiserAction } from "../account/actions";
import { useLocale } from "@/components/i18n/locale-provider";

const ERROR_KEY: Record<string, string> = {
  oauth_failed: "account.tiktokOauthFailed",
  not_configured: "account.tiktokOauthRequires",
  no_advertisers: "account.tiktokNoAdvertisers",
  sync_failed: "account.tiktokSyncFailed",
};

// The client-facing "Connect TikTok Ads" card — pure OAuth, per client.
// This never asks for a Client ID, Client Secret, access token, or
// advertiser ID: clicking Connect redirects to /api/tiktok/oauth/start,
// which resolves the org's TikTok Developer App credentials (configured
// once, separately, by the org owner — see tiktok-app-config-card.tsx)
// and sends the browser to TikTok's real authorization page. If TikTok
// grants access to more than one advertiser account, the account below
// picks from a list TikTok itself returned — never a typed-in ID.
// Access/refresh tokens are encrypted server-side (lib/security/crypto.ts)
// and are never sent to this component.
export function TikTokConnectionCard({
  clientId,
  status,
  isTikTokConfigured,
  advertiserName,
  advertiserCurrency,
  pendingAdvertisers,
  lastSyncedAt,
  lastError,
  error,
}: {
  clientId: string;
  status: string;
  isTikTokConfigured: boolean;
  advertiserName: string | null;
  advertiserCurrency: string | null;
  pendingAdvertisers: { advertiser_id: string; advertiser_name: string }[];
  lastSyncedAt: string | null;
  lastError: string | null;
  error?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [selecting, setSelecting] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const { t, intlTag } = useLocale();

  function select(advertiserId: string) {
    setSelecting(advertiserId);
    startTransition(async () => {
      setResult(null);
      const res = await selectTikTokAdvertiserAction(clientId, advertiserId);
      setSelecting(null);
      setResult(
        res.ok
          ? { ok: true, message: t("account.tiktokConnectedToAdvertiser", { advertiser: res.advertiserName, count: res.campaignCount }) }
          : { ok: false, message: res.error }
      );
    });
  }

  function refresh() {
    startTransition(async () => {
      setResult(null);
      const res = await resyncTikTokAction(clientId);
      setResult(
        res.ok
          ? { ok: true, message: t("account.tiktokRefreshedCount", { count: res.campaignCount }) }
          : { ok: false, message: res.error }
      );
    });
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Music2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{t("account.tiktokConnection")}</p>
            <p className="text-xs text-muted-foreground">{t("account.tiktokConnectionDesc")}</p>
          </div>
        </div>
        {status === "CONNECTED" ? (
          <Badge variant="positive">
            <CheckCircle2 className="h-3 w-3" /> {t("common.connected")}
          </Badge>
        ) : status === "ERROR" ? (
          <Badge variant="negative">
            <XCircle className="h-3 w-3" /> {t("common.error")}
          </Badge>
        ) : status === "PENDING_SELECTION" ? (
          <Badge variant="warning">{t("account.tiktokSelectAdvertiser")}</Badge>
        ) : (
          <Badge variant="neutral">{t("common.notConnected")}</Badge>
        )}
      </div>

      {error && ERROR_KEY[error] && (
        <p className="mt-3 rounded-md bg-negative-soft px-3 py-2 text-xs text-negative">{t(ERROR_KEY[error])}</p>
      )}
      {lastError && !error && !result && (
        <p className="mt-3 rounded-md bg-negative-soft px-3 py-2 text-xs text-negative">{lastError}</p>
      )}
      {result && (
        <p className={`mt-3 rounded-md px-3 py-2 text-xs ${result.ok ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"}`}>
          {result.message}
        </p>
      )}

      {status === "PENDING_SELECTION" && pendingAdvertisers.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs text-muted-foreground">{t("account.tiktokSelectAdvertiserDesc")}</p>
          <ul className="space-y-2">
            {pendingAdvertisers.map((a) => (
              <li key={a.advertiser_id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{a.advertiser_name}</p>
                  <p className="text-xs text-muted-foreground">{t("account.advertiserId")}: {a.advertiser_id}</p>
                </div>
                <Button size="sm" disabled={pending} onClick={() => select(a.advertiser_id)}>
                  {selecting === a.advertiser_id && pending ? t("common.connecting") : t("account.tiktokSelect")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : status === "CONNECTED" ? (
        <>
          <div className="mt-3 text-xs text-muted-foreground">
            {advertiserName} {advertiserCurrency ? `· ${advertiserCurrency}` : ""}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pending} onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" /> {t("common.refreshNow")}
            </Button>
            <Button variant="destructive" size="sm" disabled={pending} onClick={() => startTransition(() => disconnectTikTokAction(clientId))}>
              {t("common.disconnect")}
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-4">
          {/* Always a real, clickable link to the real OAuth-start route —
              never disabled client-side. If TikTok isn't configured, the
              server redirects back with ?tiktokError=not_configured and
              the banner above shows the real reason. */}
          <Button size="sm" variant="outline" asChild>
            <a href={`/api/tiktok/oauth/start?clientId=${clientId}`}>{t("account.tiktokConnect")}</a>
          </Button>
          {!isTikTokConfigured && !error && <p className="mt-2 text-xs text-muted-foreground">{t("account.tiktokOauthRequires")}</p>}
        </div>
      )}

      {lastSyncedAt && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("common.lastSynced")} {new Date(lastSyncedAt).toLocaleString(intlTag)}
        </p>
      )}
    </Card>
  );
}
