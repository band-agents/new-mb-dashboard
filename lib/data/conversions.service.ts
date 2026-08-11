import { prisma } from "@/lib/prisma";
import { getInsightRows, groupByDate } from "./insights";
import { aggregate, deriveMetrics, sumRows } from "./metrics";

export async function getConversionsOverview(params: { clientId: string; start: Date; end: Date }) {
  const rows = await getInsightRows({
    clientId: params.clientId,
    start: params.start,
    end: params.end,
    level: "CAMPAIGN",
  });
  const totals = aggregate(rows);

  const funnel = rows.reduce(
    (acc, r) => ({
      pageViews: acc.pageViews + r.pageViews,
      viewContent: acc.viewContent + r.viewContent,
      addToCart: acc.addToCart + r.addToCart,
      initiateCheckout: acc.initiateCheckout + r.initiateCheckout,
      purchases: acc.purchases + r.purchases,
      leads: acc.leads + r.leads,
      registrations: acc.registrations + r.registrations,
    }),
    { pageViews: 0, viewContent: 0, addToCart: 0, initiateCheckout: 0, purchases: 0, leads: 0, registrations: 0 }
  );

  const series = Array.from(groupByDate(rows).entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, dayRows]) => ({ date, ...deriveMetrics(sumRows(dayRows)) }));

  return { totals, funnel, series };
}

export async function getConversionsByCampaign(params: { clientId: string; start: Date; end: Date }) {
  const campaigns = await prisma.campaign.findMany({
    where: { adAccount: { clientId: params.clientId } },
    select: { id: true, name: true, objective: true },
  });
  const results = await Promise.all(
    campaigns.map(async (c) => {
      const rows = await getInsightRows({
        clientId: params.clientId,
        start: params.start,
        end: params.end,
        level: "CAMPAIGN",
        campaignId: c.id,
      });
      return { ...c, ...aggregate(rows) };
    })
  );
  return results.filter((r) => r.spend > 0).sort((a, b) => b.conversions - a.conversions);
}
