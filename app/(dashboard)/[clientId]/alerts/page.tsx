import { requireClientInScope } from "@/lib/data/scope";
import { generateAlerts } from "@/lib/insights/alerts";
import { generateOverviewInsights } from "@/lib/insights/engine";
import { resolvePreset } from "@/lib/data/dateRange";
import { getClientTimezone } from "@/lib/data/timezone";
import { AlertCard } from "@/components/alerts/alert-card";
import { InsightCard } from "@/components/insights/insight-card";
import { EmptyState } from "@/components/states/empty-error";
import { Sparkles, ShieldCheck } from "lucide-react";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";
import { getPlatform } from "@/lib/platforms/getPlatform";

export default async function AlertsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  await requireClientInScope(clientId);
  const locale = await getLocale();
  const platform = await getPlatform();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">{t(locale, "alerts.title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "alerts.subtitle")}</p>

      {platform !== "META" ? (
        <EmptyState title={t(locale, "alerts.notAvailableForPlatform")} description={t(locale, "alerts.notAvailableForPlatformDesc")} />
      ) : (
        <AlertsData clientId={clientId} locale={locale} />
      )}
    </div>
  );
}

async function AlertsData({ clientId, locale }: { clientId: string; locale: Awaited<ReturnType<typeof getLocale>> }) {
  const alerts = await generateAlerts(clientId);
  const timezone = await getClientTimezone(clientId, "META"); // this page is Meta-only (gated above)
  const { start, end } = resolvePreset("last_30_days", timezone);
  const insights = await generateOverviewInsights({ clientId, start, end, compare: "previous_period" });

  const critical = alerts.filter((a) => a.severity === "CRITICAL");
  const warning = alerts.filter((a) => a.severity === "WARNING");
  const info = alerts.filter((a) => a.severity === "INFO");

  return (
    <>
      {alerts.length === 0 ? (
        <div className="mb-6">
          <EmptyState
            title={t(locale, "alerts.noActiveAlerts")}
            description={t(locale, "alerts.noActiveAlertsDesc")}
            action={<ShieldCheck className="mt-1 h-5 w-5 text-positive" />}
          />
        </div>
      ) : (
        <div className="mb-6 space-y-2.5">
          {critical.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
          {warning.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
          {info.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      )}

      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-semibold">{t(locale, "alerts.aiInsightsTitle")}</h2>
      </div>
      {insights.length === 0 ? (
        <EmptyState title={t(locale, "alerts.noNotableInsights")} description={t(locale, "alerts.noNotableInsightsDesc")} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {insights.map((i) => (
            <InsightCard key={i.id} insight={i} />
          ))}
        </div>
      )}
    </>
  );
}
