import { prisma } from "@/lib/prisma";
import { getInsightRows, groupByDate } from "./insights";
import { aggregate, deriveMetrics, sumRows } from "./metrics";
import type { AdPlatform } from "@/lib/platforms/types";

export async function getCampaignDetail(params: { clientId: string; campaignId: string; start: Date; end: Date; platform?: AdPlatform }) {
  const platform = params.platform ?? "META";
  const campaign = await prisma.campaign.findFirst({
    where: { id: params.campaignId, adAccount: { clientId: params.clientId, adPlatform: platform } },
    include: { adAccount: true },
  });
  if (!campaign) return null;

  const dailyRows = await getInsightRows({
    clientId: params.clientId,
    start: params.start,
    end: params.end,
    level: "CAMPAIGN",
    campaignId: campaign.id,
  });
  const totals = aggregate(dailyRows);
  const series = Array.from(groupByDate(dailyRows).entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, rows]) => ({ date, ...deriveMetrics(sumRows(rows)) }));

  const placementRows = await getInsightRows({
    clientId: params.clientId,
    start: params.start,
    end: params.end,
    level: "ACCOUNT",
    campaignId: campaign.id,
  });
  const byPlacement = new Map<string, typeof placementRows>();
  for (const r of placementRows) {
    if (!r.placement) continue;
    if (!byPlacement.has(r.placement)) byPlacement.set(r.placement, []);
    byPlacement.get(r.placement)!.push(r);
  }
  const placementBreakdown = Array.from(byPlacement.entries())
    .map(([placement, rows]) => ({ placement, ...aggregate(rows) }))
    .sort((a, b) => b.spend - a.spend);

  const adSets = await prisma.adSet.findMany({
    where: { campaignId: campaign.id },
    select: { id: true, name: true, status: true, dailyBudget: true },
  });
  const adSetInsights = await getInsightRows({
    clientId: params.clientId,
    start: params.start,
    end: params.end,
    level: "ADSET",
    campaignId: campaign.id,
  });
  const byAdSet = new Map<string, typeof adSetInsights>();
  for (const r of adSetInsights) {
    if (!r.adSetId) continue;
    if (!byAdSet.has(r.adSetId)) byAdSet.set(r.adSetId, []);
    byAdSet.get(r.adSetId)!.push(r);
  }
  const adSetBreakdown = adSets
    .map((as) => ({ ...as, ...aggregate(byAdSet.get(as.id) ?? []) }))
    .sort((a, b) => b.spend - a.spend);

  const ads = await prisma.ad.findMany({
    where: { adSet: { campaignId: campaign.id } },
    include: { creative: true },
  });
  const adInsights = await getInsightRows({
    clientId: params.clientId,
    start: params.start,
    end: params.end,
    level: "AD",
    campaignId: campaign.id,
  });
  const byAd = new Map<string, typeof adInsights>();
  for (const r of adInsights) {
    if (!r.adId) continue;
    if (!byAd.has(r.adId)) byAd.set(r.adId, []);
    byAd.get(r.adId)!.push(r);
  }
  const creativeBreakdown = ads
    .map((ad) => ({ ...ad, ...aggregate(byAd.get(ad.id) ?? []) }))
    .sort((a, b) => b.spend - a.spend);

  return { campaign, totals, series, placementBreakdown, adSetBreakdown, creativeBreakdown };
}
