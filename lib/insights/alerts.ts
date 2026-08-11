// Rule-based, deterministic alert detection — every alert here is a threshold
// applied to real aggregated metrics, never an invented conclusion.

import { prisma } from "@/lib/prisma";
import { getInsightRows } from "@/lib/data/insights";
import { aggregate } from "@/lib/data/metrics";
import { pctChange, formatCurrency, formatPercent } from "@/lib/utils";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export type GeneratedAlert = {
  id: string;
  severity: AlertSeverity;
  type: string;
  title: string;
  description: string;
  metric: string;
  changePercent: number | null;
  affectedEntityName: string;
  affectedEntityType: "campaign" | "account";
  affectedEntityId: string;
  suggestedAction: string;
  date: Date;
};

function windowsOf(end: Date, days: number) {
  const recentEnd = new Date(end);
  const recentStart = new Date(end);
  recentStart.setDate(recentStart.getDate() - (days - 1));

  const priorEnd = new Date(recentStart);
  priorEnd.setDate(priorEnd.getDate() - 1);
  const priorStart = new Date(priorEnd);
  priorStart.setDate(priorStart.getDate() - (days - 1));

  return { recentStart, recentEnd, priorStart, priorEnd };
}

export async function generateAlerts(clientId: string, asOf: Date = new Date()): Promise<GeneratedAlert[]> {
  const alerts: GeneratedAlert[] = [];
  const campaigns = await prisma.campaign.findMany({
    where: { adAccount: { clientId }, status: "ACTIVE" },
    select: { id: true, name: true },
  });
  if (campaigns.length === 0) return alerts;

  const { recentStart, recentEnd, priorStart, priorEnd } = windowsOf(asOf, 7);

  const accountRoas: number[] = [];

  for (const c of campaigns) {
    const [recentRows, priorRows] = await Promise.all([
      getInsightRows({ clientId, campaignId: c.id, level: "CAMPAIGN", start: recentStart, end: recentEnd }),
      getInsightRows({ clientId, campaignId: c.id, level: "CAMPAIGN", start: priorStart, end: priorEnd }),
    ]);
    const recent = aggregate(recentRows);
    const prior = aggregate(priorRows);
    if (recent.roas > 0) accountRoas.push(recent.roas);

    if (recent.spend < 5) continue; // not enough activity to alert on

    if (prior.spend > 5) {
      const cpcChange = pctChange(recent.cpc, prior.cpc);
      if (cpcChange >= 40) {
        alerts.push(mk(c, "CPC_SPIKE", cpcChange >= 80 ? "CRITICAL" : "WARNING",
          `CPC increased ${cpcChange.toFixed(0)}% on "${c.name}"`,
          `Cost per click rose from ${formatCurrency(prior.cpc)} to ${formatCurrency(recent.cpc)} over the last 7 days vs. the previous 7.`,
          "cpc", cpcChange, "Review targeting and bid strategy; check for rising auction competition.", asOf));
      }

      const cpmChange = pctChange(recent.cpm, prior.cpm);
      if (cpmChange >= 35) {
        alerts.push(mk(c, "CPM_SPIKE", cpmChange >= 70 ? "CRITICAL" : "WARNING",
          `CPM increased ${cpmChange.toFixed(0)}% on "${c.name}"`,
          `Cost per 1,000 impressions rose from ${formatCurrency(prior.cpm)} to ${formatCurrency(recent.cpm)}.`,
          "cpm", cpmChange, "Broaden audience or refresh creative to improve relevance and reduce cost.", asOf));
      }

      const ctrChange = pctChange(recent.ctr, prior.ctr);
      if (ctrChange <= -25) {
        alerts.push(mk(c, "CTR_DROP", ctrChange <= -45 ? "CRITICAL" : "WARNING",
          `CTR dropped ${Math.abs(ctrChange).toFixed(0)}% on "${c.name}"`,
          `Click-through rate fell from ${formatPercent(prior.ctr)} to ${formatPercent(recent.ctr)}. This often signals creative fatigue.`,
          "ctr", ctrChange, "Refresh ad creative — this ad set has likely been shown to the same audience too often.", asOf));
      }

      if (prior.roas > 0) {
        const roasChange = pctChange(recent.roas, prior.roas);
        if (roasChange <= -25) {
          alerts.push(mk(c, "ROAS_DROP", roasChange <= -50 ? "CRITICAL" : "WARNING",
            `ROAS dropped ${Math.abs(roasChange).toFixed(0)}% on "${c.name}"`,
            `Return on ad spend fell from ${prior.roas.toFixed(2)}x to ${recent.roas.toFixed(2)}x.`,
            "roas", roasChange, "Investigate landing page, offer, or audience quality changes.", asOf));
        } else if (roasChange >= 30) {
          alerts.push(mk(c, "OUTPERFORMING", "INFO",
            `"${c.name}" is outperforming its recent baseline`,
            `ROAS improved ${roasChange.toFixed(0)}% (${prior.roas.toFixed(2)}x → ${recent.roas.toFixed(2)}x). Consider scaling budget.`,
            "roas", roasChange, "Consider increasing budget while monitoring frequency and CPM.", asOf));
        }
      }

      const spendChange = pctChange(recent.spend, prior.spend);
      if (spendChange >= 60) {
        alerts.push(mk(c, "SPEND_SPIKE", spendChange >= 120 ? "CRITICAL" : "WARNING",
          `Spend increased ${spendChange.toFixed(0)}% on "${c.name}"`,
          `Spend rose from ${formatCurrency(prior.spend)} to ${formatCurrency(recent.spend)} over 7 days — verify this is intentional.`,
          "spend", spendChange, "Confirm this matches an intended budget increase; otherwise check for a bid or budget misconfiguration.", asOf));
      }
    }

    if (recent.conversions === 0 && recent.spend >= 40) {
      alerts.push(mk(c, "NO_CONVERSIONS", "CRITICAL",
        `"${c.name}" spent ${formatCurrency(recent.spend)} with zero conversions`,
        `No conversions were recorded in the last 7 days despite active spend.`,
        "conversions", null, "Verify the conversion event is configured correctly and review targeting/creative relevance.", asOf));
    }

    if (recent.frequency >= 3.5) {
      alerts.push(mk(c, "HIGH_FREQUENCY", recent.frequency >= 4.5 ? "WARNING" : "INFO",
        `Frequency is elevated on "${c.name}" (${recent.frequency.toFixed(1)}x)`,
        `The average person has seen this ad ${recent.frequency.toFixed(1)} times in the last 7 days.`,
        "frequency", null, "Expand the audience or rotate in new creative to reduce repetition.", asOf));
    }
  }

  return alerts.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function severityRank(s: AlertSeverity) {
  return s === "CRITICAL" ? 2 : s === "WARNING" ? 1 : 0;
}

function mk(
  campaign: { id: string; name: string },
  type: string,
  severity: AlertSeverity,
  title: string,
  description: string,
  metric: string,
  changePercent: number | null,
  suggestedAction: string,
  date: Date
): GeneratedAlert {
  return {
    id: `${type}-${campaign.id}`,
    severity,
    type,
    title,
    description,
    metric,
    changePercent,
    affectedEntityName: campaign.name,
    affectedEntityType: "campaign",
    affectedEntityId: campaign.id,
    suggestedAction,
    date,
  };
}
