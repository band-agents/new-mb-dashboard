"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, KeyRound, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { saveTikTokAppConfigAction, clearTikTokAppConfigAction } from "./actions";
import { useLocale } from "@/components/i18n/locale-provider";
import type { TikTokAppConfigSummary } from "@/lib/tiktok/appConfig";

// "TikTok Ads connection" card — lets an org owner enter TikTok Developer
// App credentials (Client ID / Client Secret / Redirect URI) from the
// dashboard instead of only server env vars (see lib/tiktok/appConfig.ts).
// This is app-level config shared by every client the agency manages.
//
// The Client Secret input is a plain uncontrolled field read only at
// submit time (never mirrored into component state, never logged) and is
// sent straight to the server action — this component never receives the
// stored secret back from the server, only clientId/redirectUri and a
// "configured" flag.
export function TikTokAppConfigCard({
  clientId,
  isOwner,
  summary,
  suggestedRedirectUri,
}: {
  clientId: string;
  isOwner: boolean;
  summary: TikTokAppConfigSummary;
  suggestedRedirectUri: string;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(summary.source === "NONE");
  const [tiktokClientId, setTiktokClientId] = useState(summary.source !== "NONE" ? summary.clientId : "");
  const [tiktokClientSecret, setTiktokClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState(summary.source !== "NONE" ? summary.redirectUri : suggestedRedirectUri);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const { t } = useLocale();

  function save() {
    startTransition(async () => {
      setResult(null);
      const formData = new FormData();
      formData.set("tiktokClientId", tiktokClientId);
      formData.set("tiktokClientSecret", tiktokClientSecret);
      formData.set("redirectUri", redirectUri);
      const res = await saveTikTokAppConfigAction(clientId, formData);
      if (res.ok) {
        setResult({ ok: true, message: t("account.tiktokAppSaved") });
        setTiktokClientSecret("");
        setEditing(false);
      } else {
        setResult({ ok: false, message: res.error });
      }
    });
  }

  function remove() {
    startTransition(async () => {
      setResult(null);
      const res = await clearTikTokAppConfigAction(clientId);
      if (res.ok) {
        setResult({ ok: true, message: t("account.tiktokAppRemoved") });
        setTiktokClientId("");
        setTiktokClientSecret("");
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
      ? t("account.tiktokAppConfiguredDb")
      : summary.source === "ENV"
        ? t("account.tiktokAppConfiguredEnv")
        : t("account.tiktokAppNotConfigured");

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{t("account.tiktokAppTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("account.tiktokAppDesc")}</p>
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
        <p className="mt-3 text-xs text-muted-foreground">{t("account.tiktokAppOwnerOnly")}</p>
      ) : !editing ? (
        <div className="mt-3">
          <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-[auto_1fr]">
            <span className="text-muted-foreground">{t("account.tiktokAppClientIdLabel")}</span>
            <span className="font-medium">{summary.source !== "NONE" ? summary.clientId : "—"}</span>
            <span className="text-muted-foreground">{t("account.tiktokAppRedirectUriLabel")}</span>
            <span className="break-all font-medium">{summary.source !== "NONE" ? summary.redirectUri : "—"}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pending} onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> {t("account.tiktokAppEdit")}
            </Button>
            {summary.source === "DATABASE" && (
              <Button variant="destructive" size="sm" disabled={pending} onClick={remove}>
                <Trash2 className="h-3.5 w-3.5" /> {t("account.tiktokAppRemove")}
              </Button>
            )}
          </div>
          {summary.source === "DATABASE" && <p className="mt-2 text-xs text-muted-foreground">{t("account.tiktokAppRemoveNote")}</p>}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tiktokClientId">{t("account.tiktokAppClientIdLabel")}</Label>
            <Input
              id="tiktokClientId"
              value={tiktokClientId}
              onChange={(e) => setTiktokClientId(e.target.value)}
              disabled={pending}
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tiktokClientSecret">{t("account.tiktokAppClientSecretLabel")}</Label>
            <Input
              id="tiktokClientSecret"
              type="password"
              value={tiktokClientSecret}
              onChange={(e) => setTiktokClientSecret(e.target.value)}
              placeholder={summary.source === "DATABASE" ? t("account.tiktokAppClientSecretPlaceholder") : ""}
              disabled={pending}
              className="text-xs"
            />
            <p className="text-xs text-muted-foreground">{t("account.tiktokAppClientSecretHelp")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="redirectUri">{t("account.tiktokAppRedirectUriLabel")}</Label>
            <Input
              id="redirectUri"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              disabled={pending}
              className="text-xs"
            />
            <p className="text-xs text-muted-foreground">{t("account.tiktokAppRedirectUriHelp")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={pending || !tiktokClientId.trim() || !redirectUri.trim() || (summary.source !== "DATABASE" && !tiktokClientSecret.trim())}
              onClick={save}
            >
              {pending ? t("common.saving") : t("account.tiktokAppSave")}
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
