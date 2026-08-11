import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getConversionsOverview, getConversionsByCampaign } from "@/lib/data/conversions.service";
import { getBreakdown } from "@/lib/data/audiences.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { TrendChart } from "@/components/charts/trend-chart";
import { ConversionFunnel } from "@/components/conversions/funnel";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/states/empty-error";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default async function ConversionsPage({
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

  const [{ totals, funnel, series }, byCampaign, byDevice] = await Promise.all([
    getConversionsOverview({ clientId, start, end }),
    getConversionsByCampaign({ clientId, start, end }),
    getBreakdown({ clientId, start, end, dimension: "device" }),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Conversions</h1>
      <p className="mb-4 text-sm text-muted-foreground">Website and app results tracked from your Meta account.</p>
      <FilterBar showStatusFilter={false} />

      {totals.spend === 0 ? (
        <EmptyState title="No conversion data" description="Try a wider date range." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Conversions", formatNumber(totals.conversions)],
              ["Conv. Rate", formatPercent(totals.conversionRate)],
              ["Cost/Conversion", totals.conversions > 0 ? formatCurrency(totals.costPerConversion) : "—"],
              ["Conv. Value", formatCurrency(totals.conversionValue)],
              ["Revenue", formatCurrency(totals.conversionValue)],
              ["ROAS", totals.roas > 0 ? `${totals.roas.toFixed(2)}x` : "—"],
            ].map(([label, value]) => (
              <Card key={label} className="p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
              </Card>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TrendChart title="Conversions Trend" data={series} dataKey="conversions" format="number" color="var(--color-chart-3)" />
            <ConversionFunnel funnel={funnel} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Conversions by campaign</h3>
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Campaign</th>
                      <th className="pb-2 font-medium">Objective</th>
                      <th className="pb-2 font-medium">Conversions</th>
                      <th className="pb-2 font-medium">Cost/Result</th>
                      <th className="pb-2 font-medium">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCampaign.map((c) => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="py-2">{c.name}</td>
                        <td className="py-2">{c.objective}</td>
                        <td className="py-2">{formatNumber(c.conversions)}</td>
                        <td className="py-2">{c.conversions > 0 ? formatCurrency(c.costPerConversion) : "—"}</td>
                        <td className="py-2">{c.roas > 0 ? `${c.roas.toFixed(2)}x` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Conversions by device</h3>
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Device</th>
                      <th className="pb-2 font-medium">Conversions</th>
                      <th className="pb-2 font-medium">Cost/Result</th>
                      <th className="pb-2 font-medium">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDevice.map((d) => (
                      <tr key={d.segment} className="border-t border-border">
                        <td className="py-2">{d.segment}</td>
                        <td className="py-2">{formatNumber(d.conversions)}</td>
                        <td className="py-2">{d.conversions > 0 ? formatCurrency(d.costPerConversion) : "—"}</td>
                        <td className="py-2">{d.roas > 0 ? `${d.roas.toFixed(2)}x` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
