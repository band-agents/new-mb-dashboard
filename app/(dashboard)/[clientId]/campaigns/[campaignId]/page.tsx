import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset, type ComparePreset } from "@/lib/data/dateRange";
import { getCampaignDetail } from "@/lib/data/campaignDetail.service";
import { generateCampaignInsights } from "@/lib/insights/engine";
import { FilterBar } from "@/components/filters/filter-bar";
import { TrendChart } from "@/components/charts/trend-chart";
import { InsightCard } from "@/components/insights/insight-card";
import { EmptyState } from "@/components/states/empty-error";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/utils";
import { Sparkles } from "lucide-react";

const STATUS_VARIANT: Record<string, "positive" | "warning" | "neutral"> = {
  ACTIVE: "positive",
  PAUSED: "warning",
  ARCHIVED: "neutral",
  COMPLETED: "neutral",
};

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string; campaignId: string }>;
  searchParams: Promise<{ range?: string; compare?: string }>;
}) {
  const { clientId, campaignId } = await params;
  await requireClientInScope(clientId);
  const sp = await searchParams;
  const range = (sp.range as DateRangePreset) || "last_30_days";
  const compare = (sp.compare as ComparePreset) || "previous_period";
  const { start, end } = resolvePreset(range);

  const detail = await getCampaignDetail({ clientId, campaignId, start, end });
  if (!detail) notFound();
  const { campaign, totals, series, placementBreakdown, adSetBreakdown, creativeBreakdown } = detail;

  const insights = await generateCampaignInsights({ clientId, campaignId, start, end, compare });

  return (
    <div>
      <Link
        href={`/${clientId}/campaigns`}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to campaigns
      </Link>

      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{campaign.name}</h1>
        <Badge variant={STATUS_VARIANT[campaign.status] ?? "neutral"}>{campaign.status}</Badge>
        <Badge variant="outline">{campaign.objective}</Badge>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Started {formatDate(campaign.startDate)}
        {campaign.dailyBudget ? ` · ${formatCurrency(campaign.dailyBudget)}/day budget` : ""}
      </p>

      <FilterBar showStatusFilter={false} />

      {totals.spend === 0 ? (
        <EmptyState title="No data for this period" description="Try a wider date range." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Spend", formatCurrency(totals.spend)],
              ["Impressions", formatNumber(totals.impressions)],
              ["Clicks", formatNumber(totals.clicks)],
              ["CTR", formatPercent(totals.ctr)],
              ["Conversions", formatNumber(totals.conversions)],
              ["ROAS", `${totals.roas.toFixed(2)}x`],
            ].map(([label, value]) => (
              <Card key={label} className="p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
              </Card>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TrendChart title="Daily Spend" data={series} dataKey="spend" format="currency" color="var(--color-chart-1)" />
            <TrendChart title="Daily Conversions" data={series} dataKey="conversions" format="number" color="var(--color-chart-3)" />
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-semibold">AI Performance Summary</h2>
            </div>
            {insights.length === 0 ? (
              <EmptyState title="Nothing notable" description="No significant changes detected for this campaign in this period." />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {insights.map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Placement performance</h3>
              {placementBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground">No placement breakdown available for this period.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Placement</th>
                      <th className="pb-2 font-medium">Spend</th>
                      <th className="pb-2 font-medium">CTR</th>
                      <th className="pb-2 font-medium">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placementBreakdown.map((p) => (
                      <tr key={p.placement} className="border-t border-border">
                        <td className="py-2">{p.placement}</td>
                        <td className="py-2">{formatCurrency(p.spend)}</td>
                        <td className="py-2">{formatPercent(p.ctr)}</td>
                        <td className="py-2">{p.roas > 0 ? `${p.roas.toFixed(2)}x` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Ad sets in this campaign</h3>
              {adSetBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground">No ad sets found.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Ad set</th>
                      <th className="pb-2 font-medium">Spend</th>
                      <th className="pb-2 font-medium">Conversions</th>
                      <th className="pb-2 font-medium">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adSetBreakdown.map((a) => (
                      <tr key={a.id} className="border-t border-border">
                        <td className="py-2">
                          <Link href={`/${clientId}/ad-sets?campaignId=${campaign.id}`} className="hover:text-brand hover:underline">
                            {a.name}
                          </Link>
                        </td>
                        <td className="py-2">{formatCurrency(a.spend)}</td>
                        <td className="py-2">{formatNumber(a.conversions)}</td>
                        <td className="py-2">{a.roas > 0 ? `${a.roas.toFixed(2)}x` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>

          <Card className="mt-4 p-4">
            <h3 className="mb-3 text-sm font-semibold">Creative performance</h3>
            {creativeBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">No ads found for this campaign.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {creativeBreakdown.map((ad) => (
                  <div key={ad.id} className="overflow-hidden rounded-lg border border-border">
                    {ad.creative && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ad.creative.thumbnailUrl} alt={ad.name} className="h-28 w-full object-cover" />
                    )}
                    <div className="p-2">
                      <p className="truncate text-xs font-medium">{ad.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(ad.spend)} · {ad.roas > 0 ? `${ad.roas.toFixed(2)}x ROAS` : "no conv."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
