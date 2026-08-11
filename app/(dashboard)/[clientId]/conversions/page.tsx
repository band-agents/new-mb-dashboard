import { requireClientInScope } from "@/lib/data/scope";
import { getClientCurrency } from "@/lib/data/currency";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getConversionsOverview, getConversionsByCampaign } from "@/lib/data/conversions.service";
import { getBreakdown } from "@/lib/data/audiences.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { TrendChart } from "@/components/charts/trend-chart";
import { ConversionFunnel } from "@/components/conversions/funnel";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/states/empty-error";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";
import { intlTag } from "@/lib/i18n/config";

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
  const locale = await getLocale();
  const currency = await getClientCurrency(clientId);
  const tag = intlTag(locale);
  const money = (v: number) => formatCurrency(v, currency, tag);
  const num = (v: number) => formatNumber(v, tag);

  const [{ totals, funnel, series }, byCampaign, byDevice] = await Promise.all([
    getConversionsOverview({ clientId, start, end }),
    getConversionsByCampaign({ clientId, start, end }),
    getBreakdown({ clientId, start, end, dimension: "device" }),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">{t(locale, "conversions.title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "conversions.subtitle")}</p>
      <FilterBar showStatusFilter={false} />

      {totals.spend === 0 ? (
        <EmptyState title={t(locale, "empty.noData")} description={t(locale, "empty.tryDifferentRange")} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              [t(locale, "kpi.conversions"), num(totals.conversions)],
              [t(locale, "kpi.conversionRate"), formatPercent(totals.conversionRate)],
              [t(locale, "kpi.costPerConversion"), totals.conversions > 0 ? money(totals.costPerConversion) : t(locale, "errors.unavailable")],
              [t(locale, "kpi.conversionValue"), money(totals.conversionValue)],
              [t(locale, "kpi.revenue"), money(totals.conversionValue)],
              [t(locale, "kpi.roas"), totals.roas > 0 ? `${totals.roas.toFixed(2)}x` : "—"],
            ].map(([label, value]) => (
              <Card key={label} className="p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
              </Card>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TrendChart title={t(locale, "conversions.title")} data={series} dataKey="conversions" format="number" color="var(--color-chart-3)" />
            <ConversionFunnel funnel={funnel} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">{t(locale, "conversions.byCampaign")}</h3>
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 font-medium">{t(locale, "campaigns.name")}</th>
                      <th className="pb-2 font-medium">{t(locale, "campaigns.objective")}</th>
                      <th className="pb-2 font-medium">{t(locale, "kpi.conversions")}</th>
                      <th className="pb-2 font-medium">{t(locale, "kpi.costPerConversion")}</th>
                      <th className="pb-2 font-medium">{t(locale, "kpi.roas")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCampaign.map((c) => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="py-2">{c.name}</td>
                        <td className="py-2">{c.objective}</td>
                        <td className="py-2">{num(c.conversions)}</td>
                        <td className="py-2">{c.conversions > 0 ? money(c.costPerConversion) : "—"}</td>
                        <td className="py-2">{c.roas > 0 ? `${c.roas.toFixed(2)}x` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">{t(locale, "conversions.byDevice")}</h3>
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 font-medium">{t(locale, "audiences.device")}</th>
                      <th className="pb-2 font-medium">{t(locale, "kpi.conversions")}</th>
                      <th className="pb-2 font-medium">{t(locale, "kpi.costPerConversion")}</th>
                      <th className="pb-2 font-medium">{t(locale, "kpi.roas")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDevice.map((d) => (
                      <tr key={d.segment} className="border-t border-border">
                        <td className="py-2">{d.segment}</td>
                        <td className="py-2">{num(d.conversions)}</td>
                        <td className="py-2">{d.conversions > 0 ? money(d.costPerConversion) : "—"}</td>
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
