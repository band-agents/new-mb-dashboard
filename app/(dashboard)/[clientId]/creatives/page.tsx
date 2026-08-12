import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getAdsTable } from "@/lib/data/ads.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { CreativesClient } from "@/components/creatives/creatives-client";
import { PlatformRequiredNotice } from "@/components/platforms/platform-required-notice";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";
import { getPlatform } from "@/lib/platforms/getPlatform";

export default async function CreativesPage({
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
      <h1 className="mb-1 text-xl font-semibold">{t(locale, "creatives.title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "creatives.subtitle")}</p>
      <FilterBar showStatusFilter={false} />
      {platform === "ALL" ? <PlatformRequiredNotice /> : <CreativesData clientId={clientId} start={start} end={end} platform={platform} />}
    </div>
  );
}

async function CreativesData({ clientId, start, end, platform }: { clientId: string; start: Date; end: Date; platform: "META" | "TIKTOK" }) {
  const rows = await getAdsTable({ clientId, start, end, platform });
  return <CreativesClient rows={rows} />;
}
