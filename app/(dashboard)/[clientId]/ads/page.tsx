import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getClientTimezone } from "@/lib/data/timezone";
import { getAdsTable } from "@/lib/data/ads.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { AdsClient } from "@/components/ads/ads-client";
import { PlatformRequiredNotice } from "@/components/platforms/platform-required-notice";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";
import { getPlatform } from "@/lib/platforms/getPlatform";

export default async function AdsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ range?: string; adSetId?: string }>;
}) {
  const { clientId } = await params;
  await requireClientInScope(clientId);
  const sp = await searchParams;
  const locale = await getLocale();
  const platform = await getPlatform();
  const timezone = await getClientTimezone(clientId, platform === "ALL" ? "META" : platform);
  const { start, end } = resolvePreset((sp.range as DateRangePreset) || "last_30_days", timezone);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">{t(locale, "ads.title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "ads.subtitle")}</p>
      <FilterBar showStatusFilter={false} />
      {platform === "ALL" ? (
        <PlatformRequiredNotice />
      ) : (
        <AdsData clientId={clientId} start={start} end={end} adSetId={sp.adSetId} platform={platform} />
      )}
    </div>
  );
}

async function AdsData({
  clientId,
  start,
  end,
  adSetId,
  platform,
}: {
  clientId: string;
  start: Date;
  end: Date;
  adSetId?: string;
  platform: "META" | "TIKTOK";
}) {
  const rows = await getAdsTable({ clientId, start, end, adSetId, platform });
  return <AdsClient clientId={clientId} rows={rows} />;
}
