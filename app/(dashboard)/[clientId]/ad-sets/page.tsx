import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getAdSetsTable } from "@/lib/data/adsets.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { AdSetsClient } from "@/components/adsets/adsets-client";

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

  const rows = await getAdSetsTable({ clientId, start, end, campaignId: sp.campaignId });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Ad Sets</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {rows.length} ad set{rows.length === 1 ? "" : "s"}
        {sp.campaignId ? " in this campaign" : " across all campaigns"}.
      </p>
      <FilterBar showStatusFilter={false} />
      <AdSetsClient clientId={clientId} rows={rows} />
    </div>
  );
}
