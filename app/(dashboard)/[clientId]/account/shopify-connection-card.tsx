"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, RefreshCw, ShoppingBag, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { connectShopifyWithTokenAction, disconnectShopifyAction, resyncShopifyAction } from "./actions";
import { useLocale } from "@/components/i18n/locale-provider";

const ERROR_KEY: Record<string, string> = {
  oauth_failed: "account.shopifyOauthFailed",
  invalid_domain: "account.shopifyInvalidDomain",
  not_configured: "account.shopifyNotConfigured",
  sync_failed: "account.shopifySyncFailed",
};

// Shopify retired the old "API credentials" tab that used to let a
// merchant copy a static Admin API access token straight out of their
// store admin — new custom apps no longer produce one that way. OAuth
// (Authorization Code Grant, verified current against Shopify's own 2026
// docs — see lib/shopify/oauth.ts) is the only flow guaranteed to work for
// a client connecting today, so it's the primary/first path here. The
// paste-a-token flow is kept as a collapsed fallback for stores that
// already have a still-valid legacy token — never as the default option.
export function ShopifyConnectionCard({
  clientId,
  status,
  isShopifyConfigured,
  lastSyncedAt,
  lastError,
  error,
}: {
  clientId: string;
  status: string;
  isShopifyConfigured: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  error?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [domain, setDomain] = useState("");
  const [token, setToken] = useState("");
  const [showLegacyToken, setShowLegacyToken] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const { t, intlTag } = useLocale();

  function submit() {
    startTransition(async () => {
      setResult(null);
      const res = await connectShopifyWithTokenAction(clientId, domain, token);
      if (res.ok) {
        setDomain("");
        setToken("");
        setResult({ ok: true, message: t("account.shopifyConnectedToStore", { store: res.storeName, count: res.orderCount }) });
      } else {
        setResult({ ok: false, message: res.error });
      }
    });
  }

  function refresh() {
    startTransition(async () => {
      setResult(null);
      const res = await resyncShopifyAction(clientId);
      setResult(
        res.ok
          ? { ok: true, message: t("account.shopifyRefreshedCount", { count: res.orderCount }) }
          : { ok: false, message: res.error }
      );
    });
  }

  const oauthHref = domain.trim()
    ? `/api/shopify/oauth/start?clientId=${clientId}&shop=${encodeURIComponent(domain.trim())}`
    : undefined;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{t("account.shopifyConnection")}</p>
            <p className="text-xs text-muted-foreground">{t("account.shopifyConnectionDesc")}</p>
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

      {status === "CONNECTED" ? (
        <div className="mt-4 flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={pending} onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5" /> {t("common.refreshNow")}
          </Button>
          <Button variant="destructive" size="sm" disabled={pending} onClick={() => startTransition(() => disconnectShopifyAction(clientId))}>
            {t("common.disconnect")}
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="shop-domain">{t("account.shopifyDomainLabel")}</Label>
            <Input
              id="shop-domain"
              placeholder={t("account.shopifyDomainPlaceholder")}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={pending}
              className="text-xs"
            />
          </div>

          <div>
            <Button size="sm" asChild disabled={!isShopifyConfigured || !oauthHref}>
              <a href={oauthHref ?? "#"} aria-disabled={!isShopifyConfigured || !oauthHref}>
                {t("account.shopifyConnectOauth")}
              </a>
            </Button>
            {!isShopifyConfigured ? (
              <p className="mt-2 text-xs text-muted-foreground">{t("account.shopifyOauthRequires")}</p>
            ) : !domain.trim() ? (
              <p className="mt-2 text-xs text-muted-foreground">{t("account.shopifyInvalidDomain")}</p>
            ) : null}
          </div>

          <div className="pt-1">
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowLegacyToken((v) => !v)}
            >
              {showLegacyToken ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />}
              {t("account.shopifyLegacyTokenToggle")}
            </button>

            {showLegacyToken && (
              <div className="mt-2 space-y-2 rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">{t("account.shopifyLegacyTokenDesc")}</p>
                <Label htmlFor="shop-token">{t("account.shopifyTokenLabel")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="shop-token"
                    type="password"
                    placeholder="shpat_..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={pending}
                    className="text-xs"
                  />
                  <Button size="sm" variant="outline" disabled={pending || !domain.trim() || !token.trim()} onClick={submit}>
                    {pending ? t("common.connecting") : t("common.connect")}
                  </Button>
                </div>
              </div>
            )}
          </div>
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
