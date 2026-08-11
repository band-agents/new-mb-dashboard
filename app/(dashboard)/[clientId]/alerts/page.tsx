import { requireClientInScope } from "@/lib/data/scope";
import { generateAlerts } from "@/lib/insights/alerts";
import { generateOverviewInsights } from "@/lib/insights/engine";
import { resolvePreset } from "@/lib/data/dateRange";
import { AlertCard } from "@/components/alerts/alert-card";
import { InsightCard } from "@/components/insights/insight-card";
import { EmptyState } from "@/components/states/empty-error";
import { Sparkles, ShieldCheck } from "lucide-react";

export default async function AlertsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  await requireClientInScope(clientId);

  const alerts = await generateAlerts(clientId);
  const { start, end } = resolvePreset("last_30_days");
  const insights = await generateOverviewInsights({ clientId, start, end, compare: "previous_period" });

  const critical = alerts.filter((a) => a.severity === "CRITICAL");
  const warning = alerts.filter((a) => a.severity === "WARNING");
  const info = alerts.filter((a) => a.severity === "INFO");

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Alerts & Insights</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Automatically detected changes, anomalies, and opportunities from the last 7 days vs. the prior 7.
      </p>

      {alerts.length === 0 ? (
        <div className="mb-6">
          <EmptyState
            title="No active alerts"
            description="We didn't detect any significant anomalies in active campaigns right now."
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
        <h2 className="text-sm font-semibold">AI Insights — Last 30 days</h2>
      </div>
      {insights.length === 0 ? (
        <EmptyState title="No notable insights" description="Nothing significant to report for this period." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {insights.map((i) => (
            <InsightCard key={i.id} insight={i} />
          ))}
        </div>
      )}
    </div>
  );
}
