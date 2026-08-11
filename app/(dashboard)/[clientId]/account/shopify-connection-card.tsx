"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, RefreshCw, ShoppingBag, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { connectShopifyWithTokenAction, disconnectShopifyAction, resyncShopifyAction } from "./actions";
import { useLocale } from "@/components/i18n/locale-provider";

export function ShopifyConnectionCard({
  clientId,
  status,
  lastSyncedAt,
  lastError,
}: {
  clientId: string;
  status: string;
  lastSyncedAt: string | null;
  lastError: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [domain, setDomain] = useState("");
  const [token, setToken] = useState("");
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

      {lastError && !result && (
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
          <p className="text-xs text-muted-foreground">
            {t("account.shopifyHelpPrefix")}{" "}
            <code className="rounded bg-muted px-1 py-0.5">{t("account.shopifyHelpScopes")}</code>{" "}
            {t("account.shopifyHelpSuffix")}
          </p>
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
          <div className="space-y-1.5">
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
              <Button size="sm" disabled={pending || !domain.trim() || !token.trim()} onClick={submit}>
                {pending ? t("common.connecting") : t("common.connect")}
              </Button>
            </div>
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
