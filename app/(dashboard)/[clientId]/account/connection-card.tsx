"use client";

import { useTransition } from "react";
import { CheckCircle2, PlugZap, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { disconnectMetaAction } from "./actions";

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

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <PlugZap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Meta account connection</p>
            <p className="text-xs text-muted-foreground">
              Connect a Meta Business ad account to pull live campaign, ad, and insights data.
            </p>
          </div>
        </div>
        {status === "CONNECTED" ? (
          <Badge variant="positive">
            <CheckCircle2 className="h-3 w-3" /> Connected
          </Badge>
        ) : status === "ERROR" ? (
          <Badge variant="negative">
            <XCircle className="h-3 w-3" /> Error
          </Badge>
        ) : (
          <Badge variant="neutral">Not connected</Badge>
        )}
      </div>

      {error === "not_configured" && (
        <p className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
          Meta App credentials aren&apos;t configured on this server yet. Set META_APP_ID and META_APP_SECRET in
          the environment to enable live connections. The dashboard will keep running in Demo Mode until then.
        </p>
      )}
      {error === "oauth_failed" && (
        <p className="mt-3 rounded-md bg-negative-soft px-3 py-2 text-xs text-negative">
          The Meta authorization was cancelled or failed. Please try connecting again.
        </p>
      )}
      {lastError && !error && (
        <p className="mt-3 rounded-md bg-negative-soft px-3 py-2 text-xs text-negative">{lastError}</p>
      )}

      <div className="mt-4 flex items-center gap-2">
        {status === "CONNECTED" ? (
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(() => disconnectMetaAction(clientId))}
          >
            Disconnect
          </Button>
        ) : (
          <Button size="sm" asChild disabled={!isMetaConfigured}>
            <a href={`/api/meta/oauth/start?clientId=${clientId}`}>Connect with Meta</a>
          </Button>
        )}
        {!isMetaConfigured && status !== "CONNECTED" && (
          <span className="text-xs text-muted-foreground">Not available until Meta App credentials are configured.</span>
        )}
      </div>

      {lastSyncedAt && (
        <p className="mt-3 text-xs text-muted-foreground">Last synced {new Date(lastSyncedAt).toLocaleString()}</p>
      )}
    </Card>
  );
}
