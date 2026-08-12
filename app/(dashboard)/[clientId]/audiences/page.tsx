import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getClientTimezone } from "@/lib/data/timezone";
import { getBreakdown } from "@/lib/data/audiences.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { BreakdownView } from "@/components/audiences/breakdown-view";
import { PlatformRequiredNotice } from "@/components/platforms/platform-required-notice";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";
import { getPlatform } from "@/lib/platforms/getPlatform";

export default async function AudiencesPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ range?: string }>;
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
      <h1 className="mb-1 text-xl font-semibold">{t(locale, "audiences.title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "audiences.subtitle")}</p>
      <FilterBar showStatusFilter={false} />
      {platform === "ALL" ? (
        <PlatformRequiredNotice />
      ) : (
        <AudiencesData clientId={clientId} start={start} end={end} platform={platform} />
      )}
    </div>
  );
}

async function AudiencesData({ clientId, start, end, platform }: { clientId: string; start: Date; end: Date; platform: "META" | "TIKTOK" }) {
  const [ageRange, gender, region, device, placement] = await Promise.all([
    getBreakdown({ clientId, start, end, dimension: "ageRange", platform }),
    getBreakdown({ clientId, start, end, dimension: "gender", platform }),
    getBreakdown({ clientId, start, end, dimension: "region", platform }),
    getBreakdown({ clientId, start, end, dimension: "device", platform }),
    getBreakdown({ clientId, start, end, dimension: "placement", platform }),
  ]);
  return <BreakdownView data={{ ageRange, gender, region, device, placement }} />;
}
