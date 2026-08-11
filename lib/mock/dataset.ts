import { makeRng, rngRange, rngInt, pick } from "./rng";
import {
  OBJECTIVES,
  PLACEMENTS,
  DEVICES,
  PLATFORMS,
  AGE_RANGES,
  GENDERS,
  REGIONS,
  campaignName,
  randomCreative,
} from "./catalog";

export const DATASET_DAYS = 90;

export type DailyMetric = {
  date: Date;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  linkClicks: number;
  conversions: number;
  conversionValue: number;
  leads: number;
  purchases: number;
  addToCart: number;
  initiateCheckout: number;
  pageViews: number;
  viewContent: number;
  registrations: number;
  engagement: number;
};

/** Shared per-campaign "personality" so a campaign's story is coherent day to day. */
export type CampaignProfile = {
  objective: (typeof OBJECTIVES)[number];
  tier: "small" | "mid" | "large";
  trendSlope: number; // -0.3..+0.4 -> declining or improving efficiency over the window
  ctrFatigue: boolean; // steadily declining CTR in the last 14 days (creative fatigue)
  cpcSpikeDay?: number; // index of a one-off CPC/CPM anomaly
  hasConversionGap: boolean; // spends steadily but converts ~0 (budget-waste narrative)
};

const TIER_SPEND: Record<CampaignProfile["tier"], [number, number]> = {
  small: [25, 70],
  mid: [80, 220],
  large: [250, 600],
};

const OBJECTIVE_CTR: Record<string, [number, number]> = {
  AWARENESS: [0.4, 0.8],
  TRAFFIC: [0.9, 1.6],
  ENGAGEMENT: [1.2, 2.2],
  LEADS: [1.0, 1.8],
  APP_PROMOTION: [0.8, 1.4],
  SALES: [1.1, 2.0],
};

const OBJECTIVE_CPM: Record<string, [number, number]> = {
  AWARENESS: [5, 9],
  TRAFFIC: [7, 12],
  ENGAGEMENT: [6, 11],
  LEADS: [9, 16],
  APP_PROMOTION: [8, 14],
  SALES: [10, 18],
};

const OBJECTIVE_CONV_RATE: Record<string, [number, number]> = {
  AWARENESS: [0, 0],
  TRAFFIC: [0.5, 1.5],
  ENGAGEMENT: [0.3, 1.0],
  LEADS: [3, 7],
  APP_PROMOTION: [4, 9],
  SALES: [2, 5],
};

export function makeCampaignProfile(rng: () => number, index: number): CampaignProfile {
  const objective = OBJECTIVES[index % OBJECTIVES.length];
  const tier = pick(rng, ["small", "mid", "large"] as const);
  const trendSlope = rngRange(rng, -0.3, 0.4);
  const ctrFatigue = rng() < 0.25;
  const hasConversionGap = objective !== "AWARENESS" && rng() < 0.12;
  const cpcSpikeDay = rng() < 0.3 ? rngInt(rng, DATASET_DAYS - 10, DATASET_DAYS - 2) : undefined;
  return { objective, tier, trendSlope, ctrFatigue, cpcSpikeDay, hasConversionGap };
}

export function generateDailySeries(
  rng: () => number,
  profile: CampaignProfile,
  startDate: Date,
  aov: number
): DailyMetric[] {
  const [minSpend, maxSpend] = TIER_SPEND[profile.tier];
  const baseDailySpend = rngRange(rng, minSpend, maxSpend);
  const [ctrMin, ctrMax] = OBJECTIVE_CTR[profile.objective];
  const ctrBase = rngRange(rng, ctrMin, ctrMax);
  const [cpmMin, cpmMax] = OBJECTIVE_CPM[profile.objective];
  const cpmBase = rngRange(rng, cpmMin, cpmMax);
  const [convMin, convMax] = OBJECTIVE_CONV_RATE[profile.objective];
  const convRateBase = rngRange(rng, convMin, convMax);

  const series: DailyMetric[] = [];

  for (let t = 0; t < DATASET_DAYS; t++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + t);
    const weekday = date.getDay();
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.82 : 1.04;
    const trendFactor = 1 + profile.trendSlope * (t / DATASET_DAYS);
    const noise = rngRange(rng, 0.85, 1.15);

    let spend = baseDailySpend * weekendFactor * trendFactor * noise;

    let cpm = cpmBase * rngRange(rng, 0.92, 1.08) * (1 / trendFactor);
    let ctr = ctrBase * rngRange(rng, 0.85, 1.15);

    // creative fatigue: CTR erodes steadily over the final 14 days
    if (profile.ctrFatigue && t >= DATASET_DAYS - 14) {
      const decay = 1 - 0.035 * (t - (DATASET_DAYS - 14));
      ctr *= Math.max(decay, 0.4);
    }

    // one-off CPC/CPM anomaly spike
    if (profile.cpcSpikeDay !== undefined && t === profile.cpcSpikeDay) {
      cpm *= rngRange(rng, 1.6, 2.2);
      spend *= rngRange(rng, 1.2, 1.5);
    }

    const impressions = Math.max(50, Math.round((spend / cpm) * 1000));
    const clicks = Math.max(0, Math.round((impressions * ctr) / 100));
    const linkClicks = Math.round(clicks * rngRange(rng, 0.82, 0.95));

    // frequency creeps up slightly as the flight progresses (audience saturation)
    const frequency = Number((1.15 + (t / DATASET_DAYS) * 1.1 + rngRange(rng, -0.1, 0.15)).toFixed(2));
    const reach = Math.max(1, Math.round(impressions / Math.max(frequency, 1)));

    let convRate = convRateBase * rngRange(rng, 0.75, 1.25);
    if (profile.hasConversionGap) convRate = 0;

    const conversions = Math.max(0, Math.round((clicks * convRate) / 100));
    const conversionValue = Number((conversions * aov * rngRange(rng, 0.8, 1.2)).toFixed(2));

    const isFunnelObjective = profile.objective === "SALES" || profile.objective === "LEADS" || profile.objective === "APP_PROMOTION";
    const pageViews = isFunnelObjective ? Math.round(linkClicks * rngRange(rng, 0.75, 0.95)) : 0;
    const viewContent = isFunnelObjective ? Math.round(pageViews * rngRange(rng, 0.55, 0.8)) : 0;
    const addToCart = profile.objective === "SALES" ? Math.round(viewContent * rngRange(rng, 0.18, 0.35)) : 0;
    const initiateCheckout = profile.objective === "SALES" ? Math.round(addToCart * rngRange(rng, 0.45, 0.7)) : 0;
    const purchases = profile.objective === "SALES" ? conversions : 0;
    const leads = profile.objective === "LEADS" ? conversions : 0;
    const registrations = profile.objective === "APP_PROMOTION" ? conversions : 0;
    const engagement =
      profile.objective === "ENGAGEMENT"
        ? Math.round(impressions * rngRange(rng, 0.02, 0.06))
        : Math.round(clicks * rngRange(rng, 0.1, 0.3));

    series.push({
      date,
      spend: Number(spend.toFixed(2)),
      impressions,
      reach,
      frequency,
      clicks,
      linkClicks,
      conversions,
      conversionValue,
      leads,
      purchases,
      addToCart,
      initiateCheckout,
      pageViews,
      viewContent,
      registrations,
      engagement,
    });
  }

  return series;
}

export function scaleSeries(series: DailyMetric[], factor: number): DailyMetric[] {
  return series.map((d) => ({
    ...d,
    spend: Number((d.spend * factor).toFixed(2)),
    impressions: Math.round(d.impressions * factor),
    reach: Math.round(d.reach * factor),
    clicks: Math.round(d.clicks * factor),
    linkClicks: Math.round(d.linkClicks * factor),
    conversions: Math.round(d.conversions * factor),
    conversionValue: Number((d.conversionValue * factor).toFixed(2)),
    leads: Math.round(d.leads * factor),
    purchases: Math.round(d.purchases * factor),
    addToCart: Math.round(d.addToCart * factor),
    initiateCheckout: Math.round(d.initiateCheckout * factor),
    pageViews: Math.round(d.pageViews * factor),
    viewContent: Math.round(d.viewContent * factor),
    registrations: Math.round(d.registrations * factor),
    engagement: Math.round(d.engagement * factor),
  }));
}

export function sumSeries(series: DailyMetric[]) {
  return series.reduce(
    (acc, d) => ({
      spend: acc.spend + d.spend,
      impressions: acc.impressions + d.impressions,
      reach: acc.reach + d.reach,
      clicks: acc.clicks + d.clicks,
      linkClicks: acc.linkClicks + d.linkClicks,
      conversions: acc.conversions + d.conversions,
      conversionValue: acc.conversionValue + d.conversionValue,
      leads: acc.leads + d.leads,
      purchases: acc.purchases + d.purchases,
    }),
    { spend: 0, impressions: 0, reach: 0, clicks: 0, linkClicks: 0, conversions: 0, conversionValue: 0, leads: 0, purchases: 0 }
  );
}

export { OBJECTIVES, PLACEMENTS, DEVICES, PLATFORMS, AGE_RANGES, GENDERS, REGIONS, campaignName, randomCreative, makeRng };
