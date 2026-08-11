import { prisma } from "@/lib/prisma";
import { deriveMetrics, type RawTotals } from "./metrics";

export async function getAdsTable(params: { clientId: string; start: Date; end: Date; adSetId?: string }) {
  const ads = await prisma.ad.findMany({
    where: {
      adSet: {
        campaign: { adAccount: { clientId: params.clientId } },
        ...(params.adSetId ? { id: params.adSetId } : {}),
      },
    },
    select: {
      id: true,
      name: true,
      status: true,
      creative: true,
      adSet: { select: { id: true, name: true, campaign: { select: { id: true, name: true } } } },
    },
  });
  if (ads.length === 0) return [];

  const grouped = await prisma.insightSnapshot.groupBy({
    by: ["adId"],
    where: { level: "AD", adId: { in: ads.map((a) => a.id) }, date: { gte: params.start, lte: params.end } },
    _sum: {
      spend: true,
      impressions: true,
      reach: true,
      clicks: true,
      linkClicks: true,
      conversions: true,
      conversionValue: true,
      leads: true,
      purchases: true,
      engagement: true,
    },
    _avg: { frequency: true },
  });
  const byId = new Map(grouped.map((g) => [g.adId, g]));

  return ads.map((a) => {
    const g = byId.get(a.id);
    const totals: RawTotals = {
      spend: g?._sum.spend ?? 0,
      impressions: g?._sum.impressions ?? 0,
      reach: g?._sum.reach ?? 0,
      clicks: g?._sum.clicks ?? 0,
      linkClicks: g?._sum.linkClicks ?? 0,
      conversions: g?._sum.conversions ?? 0,
      conversionValue: g?._sum.conversionValue ?? 0,
      leads: g?._sum.leads ?? 0,
      purchases: g?._sum.purchases ?? 0,
      engagement: g?._sum.engagement ?? 0,
      frequencySum: g?._avg.frequency ?? 0,
      frequencyCount: g ? 1 : 0,
    };
    return {
      id: a.id,
      name: a.name,
      status: a.status,
      creative: a.creative,
      adSetId: a.adSet.id,
      adSetName: a.adSet.name,
      campaignId: a.adSet.campaign.id,
      campaignName: a.adSet.campaign.name,
      ...deriveMetrics(totals),
    };
  });
}

export type AdRow = Awaited<ReturnType<typeof getAdsTable>>[number];
