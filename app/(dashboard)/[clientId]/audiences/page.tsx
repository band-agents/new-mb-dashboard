import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getBreakdown } from "@/lib/data/audiences.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { BreakdownView } from "@/components/audiences/breakdown-view";

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
  const { start, end } = resolvePreset((sp.range as DateRangePreset) || "last_30_days");

  const [ageRange, gender, region, device, placement] = await Promise.all([
    getBreakdown({ clientId, start, end, dimension: "ageRange" }),
    getBreakdown({ clientId, start, end, dimension: "gender" }),
    getBreakdown({ clientId, start, end, dimension: "region" }),
    getBreakdown({ clientId, start, end, dimension: "device" }),
    getBreakdown({ clientId, start, end, dimension: "placement" }),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Audiences</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        See which audiences and placements are performing best across all campaigns.
      </p>
      <FilterBar showStatusFilter={false} />
      <BreakdownView data={{ ageRange, gender, region, device, placement }} />
    </div>
  );
}
