import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getPerformanceSeries } from "@/lib/data/performance.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { PerformanceClient } from "@/components/performance/performance-client";
import { EmptyState } from "@/components/states/empty-error";
import { PlatformRequiredNotice } from "@/components/platforms/platform-required-notice";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";
import { getPlatform } from "@/lib/platforms/getPlatform";

export default async function PerformancePage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { clientId } = await params;
  await requireClientInScope(clientId);
  const sp = await searchParams;
  const { start, end } = resolvePreset((sp.range as DateRangePreset) || "last_30_days");
  const locale = await getLocale();
  const platform = await getPlatform();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">{t(locale, "performance.title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "performance.subtitle")}</p>
      <FilterBar showStatusFilter={false} />
      {platform === "ALL" ? <PlatformRequiredNotice /> : <PerformanceData clientId={clientId} start={start} end={end} platform={platform} locale={locale} />}
    </div>
  );
}

async function PerformanceData({
  clientId,
  start,
  end,
  platform,
  locale,
}: {
  clientId: string;
  start: Date;
  end: Date;
  platform: "META" | "TIKTOK";
  locale: Awaited<ReturnType<typeof getLocale>>;
}) {
  const series = await getPerformanceSeries({ clientId, start, end, platform });
  if (series.length === 0) {
    return <EmptyState title={t(locale, "empty.noData")} description={t(locale, "empty.tryDifferentRange")} />;
  }
  return <PerformanceClient series={series as any} />;
}
