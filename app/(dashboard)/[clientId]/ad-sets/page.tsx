import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getAdSetsTable } from "@/lib/data/adsets.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { AdSetsClient } from "@/components/adsets/adsets-client";
import { PlatformRequiredNotice } from "@/components/platforms/platform-required-notice";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";
import { getPlatform } from "@/lib/platforms/getPlatform";

export default async function AdSetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ range?: string; campaignId?: string }>;
}) {
  const { clientId } = await params;
  await requireClientInScope(clientId);
  const sp = await searchParams;
  const { start, end } = resolvePreset((sp.range as DateRangePreset) || "last_30_days");
  const locale = await getLocale();
  const platform = await getPlatform();
  const isTikTok = platform === "TIKTOK";

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">{t(locale, isTikTok ? "adSets.titleTikTok" : "adSets.title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, isTikTok ? "adSets.subtitleTikTok" : "adSets.subtitle")}</p>
      <FilterBar showStatusFilter={false} />
      {platform === "ALL" ? (
        <PlatformRequiredNotice />
      ) : (
        <AdSetsData clientId={clientId} start={start} end={end} campaignId={sp.campaignId} platform={platform} />
      )}
    </div>
  );
}

async function AdSetsData({
  clientId,
  start,
  end,
  campaignId,
  platform,
}: {
  clientId: string;
  start: Date;
  end: Date;
  campaignId?: string;
  platform: "META" | "TIKTOK";
}) {
  const rows = await getAdSetsTable({ clientId, start, end, campaignId, platform });
  return <AdSetsClient clientId={clientId} rows={rows} />;
}
