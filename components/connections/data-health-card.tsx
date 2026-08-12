import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";
import type { DataHealthSummary, PlatformCode } from "@/lib/data/dataHealth.service";

const PLATFORM_LABEL_KEY: Record<PlatformCode, string> = {
  META: "platform.meta",
  TIKTOK: "platform.tiktok",
  SHOPIFY: "shopify.title",
};

// A single, honest at-a-glance summary — server component, no client
// state, just renders exactly what lib/data/dataHealth.service.ts
// computed from real connection/account rows.
export async function DataHealthCard({ summary }: { summary: DataHealthSummary }) {
  const locale = await getLocale();
  const connectedPlatforms = summary.platforms.filter((p) => p.connected);
  const allHealthy = connectedPlatforms.length > 0 && !summary.hasAnyError && !summary.hasAnyStaleData && !summary.currencyMismatch;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t(locale, "dataHealth.title")}</h2>
        {connectedPlatforms.length === 0 ? (
          <Badge variant="neutral">{t(locale, "dataHealth.noneConnected")}</Badge>
        ) : allHealthy ? (
          <Badge variant="positive">
            <CheckCircle2 className="h-3 w-3" /> {t(locale, "dataHealth.allHealthy")}
          </Badge>
        ) : (
          <Badge variant="warning">
            <AlertTriangle className="h-3 w-3" /> {t(locale, "dataHealth.issuesFound")}
          </Badge>
        )}
      </div>

      {connectedPlatforms.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t(locale, "dataHealth.noneConnectedDesc")}</p>
      ) : (
        <div className="space-y-2">
          {summary.currencyMismatch && (
            <div className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {t(locale, "dataHealth.currencyMismatch", {
                  currencies: connectedPlatforms.map((p) => `${t(locale, PLATFORM_LABEL_KEY[p.platform])}: ${p.currency}`).join(" · "),
                })}
              </span>
            </div>
          )}

          {summary.platforms
            .filter((p) => p.hasError || p.isStale)
            .map((p) => (
              <div key={p.platform} className="flex items-start gap-2 rounded-md bg-negative-soft px-3 py-2 text-xs text-negative">
                {p.hasError ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                <span>
                  <strong>{t(locale, PLATFORM_LABEL_KEY[p.platform])}:</strong>{" "}
                  {p.hasError
                    ? p.lastError ?? t(locale, "dataHealth.genericError")
                    : t(locale, "dataHealth.staleData", { hours: String(summary.staleAfterHours) })}
                </span>
              </div>
            ))}

          <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
            {connectedPlatforms.map((p) => (
              <div key={p.platform} className="rounded-md border border-border px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t(locale, PLATFORM_LABEL_KEY[p.platform])}</span>
                  <Badge variant={p.hasError ? "negative" : p.isStale ? "warning" : "positive"}>
                    {p.hasError ? t(locale, "common.error") : p.isStale ? t(locale, "dataHealth.stale") : t(locale, "common.connected")}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {p.lastSyncedAt
                    ? `${t(locale, "common.lastSynced")} ${new Date(p.lastSyncedAt).toLocaleString(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US")}`
                    : t(locale, "dataHealth.neverSynced")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
