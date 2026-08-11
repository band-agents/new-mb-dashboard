import { prisma } from "@/lib/prisma";
import { deriveMetrics, type RawTotals } from "./metrics";

export async function getAdSetsTable(params: { clientId: string; start: Date; end: Date; campaignId?: string }) {
  const adSets = await prisma.adSet.findMany({
    where: {
      campaign: { adAccount: { clientId: params.clientId }, ...(params.campaignId ? { id: params.campaignId } : {}) },
    },
    select: {
      id: true,
      name: true,
      status: true,
      dailyBudget: true,
      targetingSummary: true,
      campaign: { select: { id: true, name: true } },
    },
  });
  if (adSets.length === 0) return [];

  const grouped = await prisma.insightSnapshot.groupBy({
    by: ["adSetId"],
    where: { level: "ADSET", adSetId: { in: adSets.map((a) => a.id) }, date: { gte: params.start, lte: params.end } },
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
    },
    _avg: { frequency: true },
  });
  const byId = new Map(grouped.map((g) => [g.adSetId, g]));

  return adSets.map((a) => {
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
      frequencySum: g?._avg.frequency ?? 0,
      frequencyCount: g ? 1 : 0,
    };
    let targeting: { ageMin: number; ageMax: number; genders: string[]; locations: string[]; interests: string[] } | null = null;
    try {
      targeting = JSON.parse(a.targetingSummary);
    } catch {
      targeting = null;
    }
    return {
      id: a.id,
      name: a.name,
      status: a.status,
      dailyBudget: a.dailyBudget,
      campaignId: a.campaign.id,
      campaignName: a.campaign.name,
      targeting,
      ...deriveMetrics(totals),
    };
  });
}
