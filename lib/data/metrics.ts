// Pure derived-metric math, shared by every service so the definitions
// (CTR, CPC, CPM, ROAS, cost-per-result...) are computed exactly once.

export type RawTotals = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  conversions: number;
  conversionValue: number;
  leads: number;
  purchases: number;
  addToCart?: number;
  initiateCheckout?: number;
  pageViews?: number;
  viewContent?: number;
  registrations?: number;
  engagement?: number;
  frequencySum?: number;
  frequencyCount?: number;
};

export type DerivedMetrics = RawTotals & {
  ctr: number;
  cpc: number;
  cpm: number;
  costPerConversion: number;
  roas: number;
  frequency: number;
  conversionRate: number;
};

const EMPTY_TOTALS: RawTotals = {
  spend: 0,
  impressions: 0,
  reach: 0,
  clicks: 0,
  linkClicks: 0,
  conversions: 0,
  conversionValue: 0,
  leads: 0,
  purchases: 0,
  addToCart: 0,
  initiateCheckout: 0,
  pageViews: 0,
  viewContent: 0,
  registrations: 0,
  engagement: 0,
  frequencySum: 0,
  frequencyCount: 0,
};

export function sumRows<T extends Record<string, any>>(rows: T[]): RawTotals {
  const totals = { ...EMPTY_TOTALS };
  for (const r of rows) {
    totals.spend += r.spend ?? 0;
    totals.impressions += r.impressions ?? 0;
    totals.reach += r.reach ?? 0;
    totals.clicks += r.clicks ?? 0;
    totals.linkClicks += r.linkClicks ?? 0;
    totals.conversions += r.conversions ?? 0;
    totals.conversionValue += r.conversionValue ?? 0;
    totals.leads += r.leads ?? 0;
    totals.purchases += r.purchases ?? 0;
    totals.addToCart! += r.addToCart ?? 0;
    totals.initiateCheckout! += r.initiateCheckout ?? 0;
    totals.pageViews! += r.pageViews ?? 0;
    totals.viewContent! += r.viewContent ?? 0;
    totals.registrations! += r.registrations ?? 0;
    totals.engagement! += r.engagement ?? 0;
    totals.frequencySum! += r.frequency ?? 0;
    totals.frequencyCount! += 1;
  }
  return totals;
}

export function deriveMetrics(totals: RawTotals): DerivedMetrics {
  const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);
  return {
    ...totals,
    ctr: safeDiv(totals.clicks, totals.impressions) * 100,
    cpc: safeDiv(totals.spend, totals.clicks),
    cpm: safeDiv(totals.spend, totals.impressions) * 1000,
    costPerConversion: safeDiv(totals.spend, totals.conversions),
    roas: safeDiv(totals.conversionValue, totals.spend),
    frequency: safeDiv(totals.frequencySum ?? 0, totals.frequencyCount ?? 0),
    conversionRate: safeDiv(totals.conversions, totals.clicks) * 100,
  };
}

export function aggregate<T extends Record<string, any>>(rows: T[]): DerivedMetrics {
  return deriveMetrics(sumRows(rows));
}
