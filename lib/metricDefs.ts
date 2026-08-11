import { formatCurrency, formatNumber, formatPercent, formatCompact } from "./utils";

export type MetricKey =
  | "spend"
  | "impressions"
  | "reach"
  | "frequency"
  | "clicks"
  | "ctr"
  | "cpc"
  | "cpm"
  | "conversions"
  | "conversionValue"
  | "costPerConversion"
  | "roas"
  | "engagement"
  | "leads";

export type MetricDef = {
  key: MetricKey;
  /** i18n dot-path under "metrics.<key>.label" / "metrics.<key>.tooltip" — see lib/i18n/dictionaries. */
  higherIsBetter: boolean;
  /** Formats a raw value. currency/locale are required for "currency"-typed metrics; ignored otherwise. */
  format: (v: number, currency: string, locale: string) => string;
};

const currencyFmt = (v: number, currency: string, locale: string) => formatCurrency(v, currency, locale);

export const METRIC_DEFS: Record<MetricKey, MetricDef> = {
  spend: { key: "spend", format: currencyFmt, higherIsBetter: false },
  impressions: { key: "impressions", format: (v, _c, l) => formatCompact(v, l), higherIsBetter: true },
  reach: { key: "reach", format: (v, _c, l) => formatCompact(v, l), higherIsBetter: true },
  frequency: { key: "frequency", format: (v) => v.toFixed(2), higherIsBetter: false },
  clicks: { key: "clicks", format: (v, _c, l) => formatCompact(v, l), higherIsBetter: true },
  ctr: { key: "ctr", format: (v) => formatPercent(v), higherIsBetter: true },
  cpc: { key: "cpc", format: currencyFmt, higherIsBetter: false },
  cpm: { key: "cpm", format: currencyFmt, higherIsBetter: false },
  conversions: { key: "conversions", format: (v, _c, l) => formatNumber(v, l), higherIsBetter: true },
  conversionValue: { key: "conversionValue", format: currencyFmt, higherIsBetter: true },
  costPerConversion: { key: "costPerConversion", format: currencyFmt, higherIsBetter: false },
  roas: { key: "roas", format: (v) => `${v.toFixed(2)}x`, higherIsBetter: true },
  engagement: { key: "engagement", format: (v, _c, l) => formatCompact(v, l), higherIsBetter: true },
  leads: { key: "leads", format: (v, _c, l) => formatNumber(v, l), higherIsBetter: true },
};
