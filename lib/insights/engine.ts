// Deterministic, data-grounded insight generation. Every string produced here
// is built directly from computed metrics — never invented — so it stays
// traceable back to the underlying numbers per the product spec.

import { prisma } from "@/lib/prisma";
import { getInsightRows } from "@/lib/data/insights";
import { aggregate } from "@/lib/data/metrics";
import { pctChange, formatCurrency, formatPercent } from "@/lib/utils";
import { comparisonRange, type ComparePreset } from "@/lib/data/dateRange";

export type Insight = {
  id: string;
  kind: "positive" | "negative" | "neutral" | "opportunity";
  title: string;
  detail: string;
  metric: string;
  isRecommendation: boolean;
};

export async function generateOverviewInsights(params: {
  clientId: string;
  start: Date;
  end: Date;
  compare: ComparePreset;
}): Promise<Insight[]> {
  const insights: Insight[] = [];

  const campaigns = await prisma.campaign.findMany({
    where: { adAccount: { clientId: params.clientId } },
    select: { id: true, name: true, status: true },
  });
  if (campaigns.length === 0) return insights;

  const prevRange = comparisonRange({ start: params.start, end: params.end }, params.compare);

  const perCampaign = await Promise.all(
    campaigns.map(async (c) => {
      const currentRows = await getInsightRows({
        clientId: params.clientId,
        start: params.start,
        end: params.end,
        level: "CAMPAIGN",
        campaignId: c.id,
      });
      const current = aggregate(currentRows);
      let previous = null;
      if (prevRange) {
        const prevRows = await getInsightRows({
          clientId: params.clientId,
          start: prevRange.start,
          end: prevRange.end,
          level: "CAMPAIGN",
          campaignId: c.id,
        });
        previous = aggregate(prevRows);
      }
      return { campaign: c, current, previous };
    })
  );

  // 1) Biggest ROAS mover
  const withPrev = perCampaign.filter((p) => p.previous && p.previous.spend > 0 && p.current.spend > 0);
  if (withPrev.length > 0) {
    const sorted = [...withPrev].sort(
      (a, b) => pctChange(b.current.roas, b.previous!.roas) - pctChange(a.current.roas, a.previous!.roas)
    );
    const best = sorted[0];
    const bestChange = pctChange(best.current.roas, best.previous!.roas);
    if (Math.abs(bestChange) >= 8) {
      insights.push({
        id: `roas-mover-${best.campaign.id}`,
        kind: bestChange > 0 ? "positive" : "negative",
        title: `ROAS ${bestChange > 0 ? "increased" : "decreased"} ${Math.abs(bestChange).toFixed(0)}% for "${best.campaign.name}"`,
        detail: `ROAS moved from ${best.previous!.roas.toFixed(2)}x to ${best.current.roas.toFixed(2)}x versus the comparison period, on ${formatCurrency(best.current.spend)} of spend.`,
        metric: "roas",
        isRecommendation: false,
      });
    }
  }

  // 2) Spend without conversions
  const wasted = perCampaign.filter((p) => p.current.spend > 50 && p.current.conversions === 0 && p.campaign.status === "ACTIVE");
  for (const w of wasted.slice(0, 2)) {
    insights.push({
      id: `no-conversions-${w.campaign.id}`,
      kind: "negative",
      title: `"${w.campaign.name}" spent ${formatCurrency(w.current.spend)} with no recorded conversions`,
      detail: `This campaign is active and has spent ${formatCurrency(w.current.spend)} in the selected period without a single tracked conversion. Recommendation: review targeting, creative, and the conversion event setup for this campaign.`,
      metric: "conversions",
      isRecommendation: true,
    });
  }

  // 3) Best cost-per-result placement-independent — top campaign by ROAS this period
  const topRoas = [...perCampaign]
    .filter((p) => p.current.spend > 20)
    .sort((a, b) => b.current.roas - a.current.roas)[0];
  if (topRoas && topRoas.current.roas > 0) {
    insights.push({
      id: `top-roas-${topRoas.campaign.id}`,
      kind: "opportunity",
      title: `"${topRoas.campaign.name}" is your most efficient campaign right now`,
      detail: `It's returning ${topRoas.current.roas.toFixed(2)}x ROAS on ${formatCurrency(topRoas.current.spend)} spent. Recommendation: consider increasing its budget if it has room to scale without frequency climbing too fast.`,
      metric: "roas",
      isRecommendation: true,
    });
  }

  // 4) Frequency creep
  const highFreq = perCampaign.filter((p) => p.current.frequency >= 3.2 && p.campaign.status === "ACTIVE");
  for (const f of highFreq.slice(0, 1)) {
    insights.push({
      id: `frequency-${f.campaign.id}`,
      kind: "negative",
      title: `Frequency is elevated on "${f.campaign.name}" (${f.current.frequency.toFixed(1)}x)`,
      detail: `Average frequency of ${f.current.frequency.toFixed(1)} suggests the audience is seeing this ad often, which can lead to fatigue. Recommendation: refresh creative or expand the audience.`,
      metric: "frequency",
      isRecommendation: true,
    });
  }

  return insights.slice(0, 6);
}

export async function generateCampaignInsights(params: {
  clientId: string;
  campaignId: string;
  start: Date;
  end: Date;
  compare: ComparePreset;
}): Promise<Insight[]> {
  const insights: Insight[] = [];
  const campaign = await prisma.campaign.findUnique({ where: { id: params.campaignId } });
  if (!campaign) return insights;

  const currentRows = await getInsightRows({
    clientId: params.clientId,
    start: params.start,
    end: params.end,
    level: "CAMPAIGN",
    campaignId: params.campaignId,
  });
  const current = aggregate(currentRows);
  if (current.spend === 0) return insights;

  const prevRange = comparisonRange({ start: params.start, end: params.end }, params.compare);
  let previous = null;
  if (prevRange) {
    const prevRows = await getInsightRows({
      clientId: params.clientId,
      start: prevRange.start,
      end: prevRange.end,
      level: "CAMPAIGN",
      campaignId: params.campaignId,
    });
    previous = aggregate(prevRows);
  }

  if (previous && previous.spend > 0) {
    const roasChange = pctChange(current.roas, previous.roas);
    if (Math.abs(roasChange) >= 5) {
      insights.push({
        id: "roas-trend",
        kind: roasChange > 0 ? "positive" : "negative",
        title: `ROAS ${roasChange > 0 ? "improved" : "declined"} ${Math.abs(roasChange).toFixed(0)}% vs the previous period`,
        detail: `Return on ad spend moved from ${previous.roas.toFixed(2)}x to ${current.roas.toFixed(2)}x.`,
        metric: "roas",
        isRecommendation: false,
      });
    }
    const ctrChange = pctChange(current.ctr, previous.ctr);
    if (Math.abs(ctrChange) >= 10) {
      insights.push({
        id: "ctr-trend",
        kind: ctrChange > 0 ? "positive" : "negative",
        title: `CTR ${ctrChange > 0 ? "rose" : "fell"} ${Math.abs(ctrChange).toFixed(0)}%`,
        detail: `Click-through rate moved from ${formatPercent(previous.ctr)} to ${formatPercent(current.ctr)}.${
          ctrChange < 0 ? " This can be an early signal of creative fatigue — consider refreshing ad creative." : ""
        }`,
        metric: "ctr",
        isRecommendation: ctrChange < 0,
      });
    }
    const cpmChange = pctChange(current.cpm, previous.cpm);
    if (cpmChange >= 25) {
      insights.push({
        id: "cpm-spike",
        kind: "negative",
        title: `CPM spiked ${cpmChange.toFixed(0)}%`,
        detail: `Cost per 1,000 impressions rose from ${formatCurrency(previous.cpm)} to ${formatCurrency(current.cpm)}, increasing the cost to reach the same audience.`,
        metric: "cpm",
        isRecommendation: false,
      });
    }
  }

  if (current.spend > 50 && current.conversions === 0 && campaign.status === "ACTIVE") {
    insights.push({
      id: "no-conversions",
      kind: "negative",
      title: `No recorded conversions on ${formatCurrency(current.spend)} of spend`,
      detail: `Recommendation: verify the conversion event is firing correctly, and review whether targeting matches the offer.`,
      metric: "conversions",
      isRecommendation: true,
    });
  }

  if (current.frequency >= 3.5) {
    insights.push({
      id: "frequency-high",
      kind: "negative",
      title: `Frequency is high at ${current.frequency.toFixed(1)}x`,
      detail: `Recommendation: refresh creative or expand the target audience to reduce repetition fatigue.`,
      metric: "frequency",
      isRecommendation: true,
    });
  }

  return insights;
}
