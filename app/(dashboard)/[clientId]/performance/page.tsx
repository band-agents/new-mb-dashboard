import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getPerformanceSeries } from "@/lib/data/performance.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { PerformanceClient } from "@/components/performance/performance-client";
import { EmptyState } from "@/components/states/empty-error";

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

  const series = await getPerformanceSeries({ clientId, start, end });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Performance</h1>
      <p className="mb-4 text-sm text-muted-foreground">Advanced trends across every tracked metric.</p>
      <FilterBar showStatusFilter={false} />
      {series.length === 0 ? (
        <EmptyState title="No performance data" description="Try a wider date range." />
      ) : (
        <PerformanceClient series={series as any} />
      )}
    </div>
  );
}
