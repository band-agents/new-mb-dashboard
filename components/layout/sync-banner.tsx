"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatDate } from "@/lib/utils";

/**
 * Shown whenever a live-connected client's last sync attempt failed. The
 * dashboard still reads the last successfully-synced data underneath (never
 * blanked — see lib/meta/sync.ts), but the user needs to know it's stale
 * rather than assume it's current, per spec §10/§13.
 */
export function SyncBanner({ clientId, lastSyncedAt }: { clientId: string; lastSyncedAt: string | null }) {
  const { t, intlTag } = useLocale();
  return (
    <div className="flex items-center gap-2 border-b border-warning/30 bg-warning-soft px-4 py-2 text-xs text-warning md:px-6">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>{t("syncBanner.title", { date: lastSyncedAt ? formatDate(lastSyncedAt, intlTag) : "—" })}</span>
      <Link href={`/${clientId}/account`} className="ms-auto shrink-0 font-medium underline hover:no-underline">
        {t("syncBanner.action")}
      </Link>
    </div>
  );
}
