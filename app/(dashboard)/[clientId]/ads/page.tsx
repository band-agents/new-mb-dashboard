import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getAdsTable } from "@/lib/data/ads.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { AdsClient } from "@/components/ads/ads-client";

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
  const { start, end } = resolvePreset((sp.range as DateRangePreset) || "last_30_days");

  const rows = await getAdsTable({ clientId, start, end, adSetId: sp.adSetId });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Ads</h1>
      <p className="mb-4 text-sm text-muted-foreground">{rows.length} ads across all campaigns.</p>
      <FilterBar showStatusFilter={false} />
      <AdsClient clientId={clientId} rows={rows} />
    </div>
  );
}
