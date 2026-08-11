import { prisma } from "@/lib/prisma";
import { getInsightRows, groupByDate } from "./insights";
import { aggregate, deriveMetrics, sumRows } from "./metrics";
import type { AdPlatform } from "@/lib/platforms/types";

function daysBetween(start: Date, end: Date) {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

export async function getBudgetOverview(params: { clientId: string; start: Date; end: Date; platform?: AdPlatform }) {
  const platform = params.platform ?? "META";
  const campaigns = await prisma.campaign.findMany({
    where: { adAccount: { clientId: params.clientId, adPlatform: platform }, status: "ACTIVE" },
    select: { id: true, name: true, dailyBudget: true },
  });

  const totalDailyBudget = campaigns.reduce((acc, c) => acc + (c.dailyBudget ?? 0), 0);
  const totalDays = daysBetween(params.start, params.end);
  const allocatedBudget = totalDailyBudget * totalDays;

  const rows = await getInsightRows({
    clientId: params.clientId,
    start: params.start,
    end: params.end,
    level: "CAMPAIGN",
    platform,
  });
  const totals = aggregate(rows);

  const now = new Date();
  const effectiveEnd = params.end < now ? params.end : now;
  const daysElapsed = Math.min(totalDays, Math.max(1, daysBetween(params.start, effectiveEnd)));

  const expectedSpendSoFar = totalDailyBudget * daysElapsed;
  const paceRatio = expectedSpendSoFar > 0 ? totals.spend / expectedSpendSoFar : null;
  const avgDailySpend = totals.spend / daysElapsed;
  const projectedTotalSpend = avgDailySpend * totalDays;
  const remainingBudget = allocatedBudget - totals.spend;
  const utilization = allocatedBudget > 0 ? (totals.spend / allocatedBudget) * 100 : 0;

  const series = Array.from(groupByDate(rows).entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, dayRows]) => ({ date, ...deriveMetrics(sumRows(dayRows)) }));

  const perCampaign = await Promise.all(
    campaigns.map(async (c) => {
      const cRows = await getInsightRows({
        clientId: params.clientId,
        start: params.start,
        end: params.end,
        level: "CAMPAIGN",
        campaignId: c.id,
      });
      const spend = cRows.reduce((a, r) => a + r.spend, 0);
      const allocated = (c.dailyBudget ?? 0) * totalDays;
      const expected = (c.dailyBudget ?? 0) * daysElapsed;
      return {
        id: c.id,
        name: c.name,
        dailyBudget: c.dailyBudget,
        allocated,
        spend,
        pace: expected > 0 ? spend / expected : null,
      };
    })
  );

  return {
    totalDailyBudget,
    allocatedBudget,
    spend: totals.spend,
    remainingBudget,
    avgDailySpend,
    projectedTotalSpend,
    utilization,
    paceRatio,
    daysElapsed,
    totalDays,
    series,
    perCampaign: perCampaign.filter((c) => c.dailyBudget),
  };
}
