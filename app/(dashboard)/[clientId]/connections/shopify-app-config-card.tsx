"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, KeyRound, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { saveShopifyAppConfigAction, clearShopifyAppConfigAction } from "./actions";
import { useLocale } from "@/components/i18n/locale-provider";
import type { ShopifyAppConfigSummary } from "@/lib/shopify/appConfig";

// "Shopify Developer App" card — lets an org owner enter Shopify Partner/
// Dev Dashboard app credentials (Client ID / Client Secret / Redirect URI)
// from the dashboard instead of only server env vars (see
// lib/shopify/appConfig.ts). This is app-level config shared by every
// client the agency manages — distinct from ShopifyConnectionCard
// (../account/shopify-connection-card.tsx), which is the per-client
// "Connect with Shopify" card a client actually clicks. Clients never see
// this card's fields. Mirrors tiktok-app-config-card.tsx exactly.
//
// The Client Secret input is a plain uncontrolled field read only at
// submit time (never mirrored into component state, never logged) and is
// sent straight to the server action — this component never receives the
// stored secret back from the server, only clientId/redirectUri and a
// "configured" flag.
export function ShopifyAppConfigCard({
  clientId,
  isOwner,
  summary,
  suggestedRedirectUri,
}: {
  clientId: string;
  isOwner: boolean;
  summary: ShopifyAppConfigSummary;
  suggestedRedirectUri: string;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(summary.source === "NONE");
  const [shopifyClientId, setShopifyClientId] = useState(summary.source !== "NONE" ? summary.clientId : "");
  const [shopifyClientSecret, setShopifyClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState(summary.source !== "NONE" ? summary.redirectUri : suggestedRedirectUri);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const { t } = useLocale();

  function save() {
    startTransition(async () => {
      setResult(null);
      const formData = new FormData();
      formData.set("shopifyClientId", shopifyClientId);
      formData.set("shopifyClientSecret", shopifyClientSecret);
      formData.set("redirectUri", redirectUri);
      const res = await saveShopifyAppConfigAction(clientId, formData);
      if (res.ok) {
        setResult({ ok: true, message: t("account.shopifyAppSaved") });
        setShopifyClientSecret("");
        setEditing(false);
      } else {
        setResult({ ok: false, message: res.error });
      }
    });
  }

  function remove() {
    startTransition(async () => {
      setResult(null);
      const res = await clearShopifyAppConfigAction(clientId);
      if (res.ok) {
        setResult({ ok: true, message: t("account.shopifyAppRemoved") });
        setShopifyClientId("");
        setShopifyClientSecret("");
        setRedirectUri(suggestedRedirectUri);
        setEditing(true);
      } else {
        setResult({ ok: false, message: res.error });
      }
    });
  }

  const badgeVariant = summary.source === "NONE" ? "neutral" : "positive";
  const badgeLabel =
    summary.source === "DATABASE"
      ? t("account.shopifyAppConfiguredDb")
      : summary.source === "ENV"
        ? t("account.shopifyAppConfiguredEnv")
        : t("account.shopifyAppNotConfigured");

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{t("account.shopifyAppTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("account.shopifyAppDesc")}</p>
          </div>
        </div>
        <Badge variant={badgeVariant}>
          {summary.source !== "NONE" && <CheckCircle2 className="h-3 w-3" />}
          {badgeLabel}
        </Badge>
      </div>

      {result && (
        <p className={`mt-3 rounded-md px-3 py-2 text-xs ${result.ok ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"}`}>
          {result.message}
        </p>
      )}

      {!isOwner ? (
        <p className="mt-3 text-xs text-muted-foreground">{t("account.shopifyAppOwnerOnly")}</p>
      ) : !editing ? (
        <div className="mt-3">
          <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-[auto_1fr]">
            <span className="text-muted-foreground">{t("account.shopifyAppClientIdLabel")}</span>
            <span className="font-medium">{summary.source !== "NONE" ? summary.clientId : "—"}</span>
            <span className="text-muted-foreground">{t("account.shopifyAppRedirectUriLabel")}</span>
            <span className="break-all font-medium">{summary.source !== "NONE" ? summary.redirectUri : "—"}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pending} onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> {t("account.shopifyAppEdit")}
            </Button>
            {summary.source === "DATABASE" && (
              <Button variant="destructive" size="sm" disabled={pending} onClick={remove}>
                <Trash2 className="h-3.5 w-3.5" /> {t("account.shopifyAppRemove")}
              </Button>
            )}
          </div>
          {summary.source === "DATABASE" && <p className="mt-2 text-xs text-muted-foreground">{t("account.shopifyAppRemoveNote")}</p>}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="shopifyAppClientId">{t("account.shopifyAppClientIdLabel")}</Label>
            <Input
              id="shopifyAppClientId"
              value={shopifyClientId}
              onChange={(e) => setShopifyClientId(e.target.value)}
              disabled={pending}
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shopifyAppClientSecret">{t("account.shopifyAppClientSecretLabel")}</Label>
            <Input
              id="shopifyAppClientSecret"
              type="password"
              value={shopifyClientSecret}
              onChange={(e) => setShopifyClientSecret(e.target.value)}
              placeholder={summary.source === "DATABASE" ? t("account.shopifyAppClientSecretPlaceholder") : ""}
              disabled={pending}
              className="text-xs"
            />
            <p className="text-xs text-muted-foreground">{t("account.shopifyAppClientSecretHelp")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shopifyAppRedirectUri">{t("account.shopifyAppRedirectUriLabel")}</Label>
            <Input
              id="shopifyAppRedirectUri"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              disabled={pending}
              className="text-xs"
            />
            <p className="text-xs text-muted-foreground">{t("account.shopifyAppRedirectUriHelp")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={
                pending ||
                !shopifyClientId.trim() ||
                !redirectUri.trim() ||
                (summary.source !== "DATABASE" && !shopifyClientSecret.trim())
              }
              onClick={save}
            >
              {pending ? t("common.saving") : t("account.shopifyAppSave")}
            </Button>
            {summary.source !== "NONE" && (
              <Button variant="outline" size="sm" disabled={pending} onClick={() => setEditing(false)}>
                {t("common.cancel")}
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
