import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getCampaignsTable } from "@/lib/data/campaigns.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { CampaignsClient } from "@/components/campaigns/campaigns-client";
import { PlatformRequiredNotice } from "@/components/platforms/platform-required-notice";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";
import { getPlatform } from "@/lib/platforms/getPlatform";

export default async function CampaignsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ range?: string; status?: string }>;
}) {
  const { clientId } = await params;
  await requireClientInScope(clientId);
  const sp = await searchParams;
  const { start, end } = resolvePreset((sp.range as DateRangePreset) || "last_30_days");
  const locale = await getLocale();
  const platform = await getPlatform();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">{t(locale, "campaigns.title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "campaigns.subtitle")}</p>
      <FilterBar />
      {platform === "ALL" ? (
        <PlatformRequiredNotice />
      ) : (
        <CampaignsClientData clientId={clientId} start={start} end={end} status={sp.status} platform={platform} />
      )}
    </div>
  );
}

async function CampaignsClientData({
  clientId,
  start,
  end,
  status,
  platform,
}: {
  clientId: string;
  start: Date;
  end: Date;
  status?: string;
  platform: "META" | "TIKTOK";
}) {
  const rows = await getCampaignsTable({ clientId, start, end, status: status ? [status] : undefined, platform });
  return <CampaignsClient clientId={clientId} rows={rows} />;
}
