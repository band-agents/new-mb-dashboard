import { prisma } from "@/lib/prisma";
import { deriveMetrics, type RawTotals } from "./metrics";
import type { AdPlatform } from "@/lib/platforms/types";

export type BreakdownDimension = "placement" | "device" | "ageRange" | "gender" | "region";

export async function getBreakdown(params: {
  clientId: string;
  start: Date;
  end: Date;
  dimension: BreakdownDimension;
  platform?: AdPlatform;
}) {
  const rows = await prisma.insightSnapshot.groupBy({
    by: [params.dimension],
    where: {
      level: "ACCOUNT",
      adAccount: { clientId: params.clientId, adPlatform: params.platform ?? "META" },
      date: { gte: params.start, lte: params.end },
      [params.dimension]: { not: null },
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
  });

  return rows
    .map((r) => {
      const totals: RawTotals = {
        spend: r._sum.spend ?? 0,
        impressions: r._sum.impressions ?? 0,
        reach: r._sum.reach ?? 0,
        clicks: r._sum.clicks ?? 0,
        linkClicks: r._sum.linkClicks ?? 0,
        conversions: r._sum.conversions ?? 0,
        conversionValue: r._sum.conversionValue ?? 0,
        leads: r._sum.leads ?? 0,
        purchases: r._sum.purchases ?? 0,
      };
      return {
        segment: String((r as Record<string, unknown>)[params.dimension]),
        ...deriveMetrics(totals),
      };
    })
    .sort((a, b) => b.spend - a.spend);
}
