// "All Platforms" combined ad performance — Meta + TikTok only (spec §3;
// Shopify revenue is a separate blend, see unified.service.ts's
// getUnifiedOverview for the Meta+TikTok+Shopify Business Overview).
//
// Combining rule (spec's explicit warning): raw counts (spend, impressions,
// clicks, conversions, conversionValue, reach) are safe to SUM across
// platforms because they're the same unit regardless of source. Rates
// (CTR, CPC, CPM, ROAS, cost-per-conversion) are NEVER averaged — they're
// always recomputed from the summed base numbers, which is the only
// mathematically correct way to combine a rate metric.
//
// Money is only ever summed when both platforms report the same currency.
// If they differ, spend/conversionValue/CPC/CPM/ROAS/cost-per-conversion
// are left null (not silently converted or blended) and each platform's
// own totals are still returned so the UI can show them side by side.

import { getInsightRows } from "./insights";
import { aggregate, deriveMetrics, type RawTotals } from "./metrics";
import { getClientCurrency } from "./currency";
import type { ComparePreset } from "./dateRange";
import { comparisonRange } from "./dateRange";

export type CombinedAdsParams = {
  clientId: string;
  start: Date;
  end: Date;
  compare: ComparePreset;
};

function sumTotals(a: RawTotals, b: RawTotals): RawTotals {
  return {
    spend: a.spend + b.spend,
    impressions: a.impressions + b.impressions,
    reach: a.reach + b.reach,
    clicks: a.clicks + b.clicks,
    linkClicks: a.linkClicks + b.linkClicks,
    conversions: a.conversions + b.conversions,
    conversionValue: a.conversionValue + b.conversionValue,
    leads: a.leads + b.leads,
    purchases: a.purchases + b.purchases,
  };
}

export async function getCombinedAdsOverview(params: CombinedAdsParams) {
  const [metaRows, tiktokRows, metaCurrency, tiktokCurrency] = await Promise.all([
    getInsightRows({ clientId: params.clientId, start: params.start, end: params.end, level: "CAMPAIGN", platform: "META" }),
    getInsightRows({ clientId: params.clientId, start: params.start, end: params.end, level: "CAMPAIGN", platform: "TIKTOK" }),
    getClientCurrency(params.clientId, "META"),
    getClientCurrency(params.clientId, "TIKTOK"),
  ]);

  const meta = aggregate(metaRows);
  const tiktok = aggregate(tiktokRows);
  const metaHasData = metaRows.length > 0;
  const tiktokHasData = tiktokRows.length > 0;
  const currenciesMatch = metaHasData && tiktokHasData ? metaCurrency === tiktokCurrency : true;

  const combinedTotals = sumTotals(meta, tiktok);
  const combined = currenciesMatch
    ? deriveMetrics(combinedTotals)
    : // currencies differ: only currency-agnostic counts are combinable
      deriveMetrics({ ...combinedTotals, spend: 0, conversionValue: 0 });

  let previousCombined: ReturnType<typeof deriveMetrics> | null = null;
  const prevRange = comparisonRange({ start: params.start, end: params.end }, params.compare);
  if (prevRange) {
    const [prevMetaRows, prevTikTokRows] = await Promise.all([
      getInsightRows({ clientId: params.clientId, start: prevRange.start, end: prevRange.end, level: "CAMPAIGN", platform: "META" }),
      getInsightRows({ clientId: params.clientId, start: prevRange.start, end: prevRange.end, level: "CAMPAIGN", platform: "TIKTOK" }),
    ]);
    const prevTotals = sumTotals(aggregate(prevMetaRows), aggregate(prevTikTokRows));
    previousCombined = currenciesMatch ? deriveMetrics(prevTotals) : deriveMetrics({ ...prevTotals, spend: 0, conversionValue: 0 });
  }

  return {
    hasData: metaHasData || tiktokHasData,
    currenciesMatch,
    meta: { ...meta, currency: metaCurrency, hasData: metaHasData },
    tiktok: { ...tiktok, currency: tiktokCurrency, hasData: tiktokHasData },
    combined,
    previousCombined,
    combinedCurrency: currenciesMatch ? (metaHasData ? metaCurrency : tiktokCurrency) : null,
  };
}
