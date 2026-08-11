import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getCampaignsTable } from "@/lib/data/campaigns.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { CampaignsClient } from "@/components/campaigns/campaigns-client";

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

  const rows = await getCampaignsTable({
    clientId,
    start,
    end,
    status: sp.status ? [sp.status] : undefined,
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Campaigns</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {rows.length} campaign{rows.length === 1 ? "" : "s"} in the selected period.
      </p>
      <FilterBar />
      <CampaignsClient clientId={clientId} rows={rows} />
    </div>
  );
}
