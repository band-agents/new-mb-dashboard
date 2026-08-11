import { prisma } from "@/lib/prisma";
import { deriveMetrics, type RawTotals } from "./metrics";

export type CampaignRow = ReturnType<typeof deriveMetrics> & {
  id: string;
  name: string;
  status: string;
  objective: string;
  dailyBudget: number | null;
  startDate: Date;
};

export async function getCampaignsTable(params: {
  clientId: string;
  start: Date;
  end: Date;
  status?: string[];
  objective?: string[];
}): Promise<CampaignRow[]> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      adAccount: { clientId: params.clientId },
      ...(params.status?.length ? { status: { in: params.status } } : {}),
      ...(params.objective?.length ? { objective: { in: params.objective } } : {}),
    },
    select: { id: true, name: true, status: true, objective: true, dailyBudget: true, startDate: true },
  });
  if (campaigns.length === 0) return [];

  const grouped = await prisma.insightSnapshot.groupBy({
    by: ["campaignId"],
    where: {
      level: "CAMPAIGN",
      campaignId: { in: campaigns.map((c) => c.id) },
      date: { gte: params.start, lte: params.end },
    },
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

  const byId = new Map(grouped.map((g) => [g.campaignId, g]));

  return campaigns.map((c) => {
    const g = byId.get(c.id);
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
      frequencySum: (g?._avg.frequency ?? 0) * 1,
      frequencyCount: g ? 1 : 0,
    };
    return { ...c, ...deriveMetrics(totals) };
  });
}
