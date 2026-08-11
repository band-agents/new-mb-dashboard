"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, PlugZap, RefreshCw, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connectMetaWithTokenAction, disconnectMetaAction, resyncMetaAction } from "./actions";
import { useLocale } from "@/components/i18n/locale-provider";

export function ConnectionCard({
  clientId,
  status,
  isMetaConfigured,
  lastSyncedAt,
  lastError,
  error,
}: {
  clientId: string;
  status: string;
  isMetaConfigured: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  error?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [token, setToken] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const { t, intlTag } = useLocale();

  function submitToken() {
    startTransition(async () => {
      setResult(null);
      const res = await connectMetaWithTokenAction(clientId, token);
      if (res.ok) {
        setToken("");
        setResult({ ok: true, message: t("account.connectedToAccount", { account: res.adAccountName, count: res.campaignCount }) });
      } else {
        setResult({ ok: false, message: res.error });
      }
    });
  }

  function refresh() {
    startTransition(async () => {
      setResult(null);
      const res = await resyncMetaAction(clientId);
      setResult(
        res.ok
          ? { ok: true, message: t("account.refreshedCount", { count: res.campaignCount }) }
          : { ok: false, message: res.error }
      );
    });
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <PlugZap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{t("account.metaConnection")}</p>
            <p className="text-xs text-muted-foreground">{t("account.metaConnectionDesc")}</p>
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

      {error === "oauth_failed" && (
        <p className="mt-3 rounded-md bg-negative-soft px-3 py-2 text-xs text-negative">{t("account.oauthFailed")}</p>
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
          <Button variant="destructive" size="sm" disabled={pending} onClick={() => startTransition(() => disconnectMetaAction(clientId))}>
            {t("common.disconnect")}
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-medium">{t("account.pasteToken")}</p>
            <p className="mb-2 text-xs text-muted-foreground">
              {t("account.pasteTokenDescPrefix")}{" "}
              <code className="rounded bg-muted px-1 py-0.5">{t("account.scopeName")}</code>{" "}
              {t("account.pasteTokenDescSuffix")}{" "}
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noreferrer"
                className="text-brand underline"
              >
                {t("account.graphExplorer")}
              </a>
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="EAAG..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={pending}
                className="text-xs"
              />
              <Button size="sm" disabled={pending || !token.trim()} onClick={submitToken}>
                {pending ? t("common.connecting") : t("common.connect")}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> {t("account.or")} <span className="h-px flex-1 bg-border" />
          </div>

          <div>
            <Button size="sm" variant="outline" asChild disabled={!isMetaConfigured}>
              <a href={`/api/meta/oauth/start?clientId=${clientId}`}>{t("account.connectOauth")}</a>
            </Button>
            {!isMetaConfigured && <p className="mt-2 text-xs text-muted-foreground">{t("account.oauthRequires")}</p>}
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
