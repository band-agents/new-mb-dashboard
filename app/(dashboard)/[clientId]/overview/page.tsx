import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset, type ComparePreset } from "@/lib/data/dateRange";
import { getOverviewData } from "@/lib/data/overview.service";
import { getCombinedAdsOverview } from "@/lib/data/combinedAds.service";
import { generateOverviewInsights } from "@/lib/insights/engine";
import { FilterBar } from "@/components/filters/filter-bar";
import { KpiCard } from "@/components/kpi/kpi-card";
import { TrendChart } from "@/components/charts/trend-chart";
import { InsightCard } from "@/components/insights/insight-card";
import { EmptyState } from "@/components/states/empty-error";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Sparkles } from "lucide-react";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";
import { intlTag } from "@/lib/i18n/config";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { getPlatform } from "@/lib/platforms/getPlatform";

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
  const tag = intlTag(locale);
  const platform = await getPlatform();

  const range = (sp.range as DateRangePreset) || "last_30_days";
  const compare = (sp.compare as ComparePreset) || "previous_period";
  const status = sp.status;
  const { start, end } = resolvePreset(range);

  if (platform === "ALL") {
    const data = await getCombinedAdsOverview({ clientId, start, end, compare });
    const money = (v: number, currency: string) => formatCurrency(v, currency, tag);
    const num = (v: number) => formatNumber(v, tag);

    return (
      <div>
        <h1 className="mb-1 text-xl font-semibold">{t(locale, "overview.title")}</h1>
        <p className="mb-4 text-sm text-muted-foreground">{t(locale, "overview.subtitle")}</p>
        <FilterBar showStatusFilter={false} />

        {!data.hasData ? (
          <EmptyState title={t(locale, "overview.noData")} description={t(locale, "overview.noDataDescAll")} />
        ) : (
          <>
            {!data.currenciesMatch && data.meta.hasData && data.tiktok.hasData && (
              <div className="mb-4 flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{t(locale, "platform.currencyMismatchNote", { metaCurrency: data.meta.currency, tiktokCurrency: data.tiktok.currency })}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {data.currenciesMatch && data.combinedCurrency && (
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">{t(locale, "platform.combinedSpend")}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{money(data.combined.spend, data.combinedCurrency)}</p>
                </Card>
              )}
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">{t(locale, "platform.combinedImpressions")}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{num(data.combined.impressions)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">{t(locale, "platform.combinedClicks")}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{num(data.combined.clicks)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">{t(locale, "platform.combinedConversions")}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{num(data.combined.conversions)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">{t(locale, "platform.combinedCtr")}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{formatPercent(data.combined.ctr)}</p>
              </Card>
              {data.currenciesMatch && data.combinedCurrency && (
                <>
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground">{t(locale, "platform.combinedCpc")}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{money(data.combined.cpc, data.combinedCurrency)}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground">{t(locale, "platform.combinedCpm")}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{money(data.combined.cpm, data.combinedCurrency)}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground">{t(locale, "platform.combinedRoas")}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{data.combined.roas > 0 ? `${data.combined.roas.toFixed(2)}x` : "—"}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground">{t(locale, "platform.combinedCpa")}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{data.combined.conversions > 0 ? money(data.combined.costPerConversion, data.combinedCurrency) : "—"}</p>
                  </Card>
                </>
              )}
            </div>

            <Card className="mt-4 p-4">
              <h3 className="mb-3 text-sm font-semibold">{t(locale, "platform.perPlatformBreakdown")}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{t(locale, "platform.meta")}</p>
                  {data.meta.hasData ? (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      <span className="text-muted-foreground">{t(locale, "kpi.spend")}</span>
                      <span className="text-right font-medium">{money(data.meta.spend, data.meta.currency)}</span>
                      <span className="text-muted-foreground">{t(locale, "kpi.conversions")}</span>
                      <span className="text-right font-medium">{num(data.meta.conversions)}</span>
                      <span className="text-muted-foreground">{t(locale, "kpi.roas")}</span>
                      <span className="text-right font-medium">{data.meta.roas > 0 ? `${data.meta.roas.toFixed(2)}x` : "—"}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t(locale, "empty.noData")}</p>
                  )}
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{t(locale, "platform.tiktok")}</p>
                  {data.tiktok.hasData ? (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      <span className="text-muted-foreground">{t(locale, "kpi.spend")}</span>
                      <span className="text-right font-medium">{money(data.tiktok.spend, data.tiktok.currency)}</span>
                      <span className="text-muted-foreground">{t(locale, "kpi.conversions")}</span>
                      <span className="text-right font-medium">{num(data.tiktok.conversions)}</span>
                      <span className="text-muted-foreground">{t(locale, "kpi.roas")}</span>
                      <span className="text-right font-medium">{data.tiktok.roas > 0 ? `${data.tiktok.roas.toFixed(2)}x` : "—"}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t(locale, "empty.noData")}</p>
                  )}
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    );
  }

  const data = await getOverviewData({
    clientId,
    start,
    end,
    compare,
    campaignStatus: status ? [status] : undefined,
    platform,
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
        <EmptyState
          title={t(locale, "overview.noData")}
          description={t(locale, platform === "TIKTOK" ? "overview.noDataDescTikTok" : "overview.noDataDesc")}
        />
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

          {platform === "META" && (
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
          )}
        </>
      )}
    </div>
  );
}
