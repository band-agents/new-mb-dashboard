import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset, type ComparePreset } from "@/lib/data/dateRange";
import { getOverviewData } from "@/lib/data/overview.service";
import { generateOverviewInsights } from "@/lib/insights/engine";
import { FilterBar } from "@/components/filters/filter-bar";
import { KpiCard } from "@/components/kpi/kpi-card";
import { TrendChart } from "@/components/charts/trend-chart";
import { InsightCard } from "@/components/insights/insight-card";
import { EmptyState } from "@/components/states/empty-error";
import { Sparkles } from "lucide-react";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";

const PRIMARY_METRICS = ["spend", "conversions", "roas", "conversionValue"] as const;
const SECONDARY_METRICS = [
  "impressions",
  "reach",
  "frequency",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "costPerConversion",
  "engagement",
  "leads",
] as const;

export default async function OverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ range?: string; compare?: string; status?: string }>;
}) {
  const { clientId } = await params;
  await requireClientInScope(clientId);
  const sp = await searchParams;
  const locale = await getLocale();

  const range = (sp.range as DateRangePreset) || "last_30_days";
  const compare = (sp.compare as ComparePreset) || "previous_period";
  const status = sp.status;

  const { start, end } = resolvePreset(range);
  const data = await getOverviewData({
    clientId,
    start,
    end,
    compare,
    campaignStatus: status ? [status] : undefined,
  });

  const insights = data.hasData ? await generateOverviewInsights({ clientId, start, end, compare }) : [];

  const sparklineFor = (key: string) => data.series.map((s) => Number((s as unknown as Record<string, number>)[key] ?? 0));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t(locale, "overview.title")}</h1>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "overview.subtitle")}</p>

      <FilterBar />

      {!data.hasData ? (
        <EmptyState title={t(locale, "overview.noData")} description={t(locale, "overview.noDataDesc")} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {PRIMARY_METRICS.map((key) => (
              <KpiCard
                key={key}
                metricKey={key}
                value={data.current[key as keyof typeof data.current] as number}
                previousValue={data.previous ? (data.previous[key as keyof typeof data.previous] as number) : null}
                sparkline={sparklineFor(key)}
                emphasize
              />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {SECONDARY_METRICS.map((key) => (
              <KpiCard
                key={key}
                metricKey={key}
                value={data.current[key as keyof typeof data.current] as number}
                previousValue={data.previous ? (data.previous[key as keyof typeof data.previous] as number) : null}
              />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TrendChart
              title={t(locale, "overview.spendOverTime")}
              description={t(locale, "overview.spendOverTimeDesc")}
              data={data.series}
              dataKey="spend"
              color="var(--color-chart-1)"
              format="currency"
            />
            <TrendChart
              title={t(locale, "overview.revenueRoasTrend")}
              description={t(locale, "overview.revenueRoasTrendDesc")}
              data={data.series}
              dataKey="conversionValue"
              color="var(--color-chart-4)"
              format="currency"
            />
            <TrendChart
              title={t(locale, "overview.conversionsTrend")}
              description={t(locale, "overview.conversionsTrendDesc")}
              data={data.series}
              dataKey="conversions"
              color="var(--color-chart-3)"
              format="number"
            />
            <TrendChart
              title={t(locale, "overview.reachImpressions")}
              description={t(locale, "overview.reachImpressionsDesc")}
              data={data.series}
              dataKey="reach"
              color="var(--color-chart-2)"
              format="compact"
            />
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-semibold">{t(locale, "overview.aiInsights")}</h2>
              <span className="text-xs text-muted-foreground">{t(locale, "overview.aiInsightsGeneratedFrom")}</span>
            </div>
            {insights.length === 0 ? (
              <EmptyState
                title={t(locale, "overview.noNotableChanges")}
                description={t(locale, "overview.noNotableChangesDesc")}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {insights.map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
