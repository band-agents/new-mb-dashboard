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
  label: string;
  tooltip: string;
  format: (v: number) => string;
  higherIsBetter: boolean;
};

export const METRIC_DEFS: Record<MetricKey, MetricDef> = {
  spend: {
    key: "spend",
    label: "Total Spend",
    tooltip: "Total amount spent across all ads in the selected period.",
    format: (v) => formatCurrency(v),
    higherIsBetter: false,
  },
  impressions: {
    key: "impressions",
    label: "Impressions",
    tooltip: "Number of times your ads were shown on screen.",
    format: (v) => formatCompact(v),
    higherIsBetter: true,
  },
  reach: {
    key: "reach",
    label: "Reach",
    tooltip: "Number of unique people who saw your ads at least once.",
    format: (v) => formatCompact(v),
    higherIsBetter: true,
  },
  frequency: {
    key: "frequency",
    label: "Frequency",
    tooltip: "Average number of times each person saw your ad. High frequency can indicate ad fatigue.",
    format: (v) => v.toFixed(2),
    higherIsBetter: false,
  },
  clicks: {
    key: "clicks",
    label: "Clicks",
    tooltip: "Total clicks on your ads, including link clicks and other interactions.",
    format: (v) => formatCompact(v),
    higherIsBetter: true,
  },
  ctr: {
    key: "ctr",
    label: "CTR",
    tooltip: "Click-through rate: clicks divided by impressions.",
    format: (v) => formatPercent(v),
    higherIsBetter: true,
  },
  cpc: {
    key: "cpc",
    label: "CPC",
    tooltip: "Average cost per click.",
    format: (v) => formatCurrency(v),
    higherIsBetter: false,
  },
  cpm: {
    key: "cpm",
    label: "CPM",
    tooltip: "Average cost per 1,000 impressions.",
    format: (v) => formatCurrency(v),
    higherIsBetter: false,
  },
  conversions: {
    key: "conversions",
    label: "Conversions",
    tooltip: "Total tracked conversions (purchases, leads, sign-ups, and other configured events).",
    format: (v) => formatNumber(v),
    higherIsBetter: true,
  },
  conversionValue: {
    key: "conversionValue",
    label: "Conversion Value",
    tooltip: "Total monetary value generated from tracked conversions.",
    format: (v) => formatCurrency(v),
    higherIsBetter: true,
  },
  costPerConversion: {
    key: "costPerConversion",
    label: "Cost / Conversion",
    tooltip: "Average amount spent per conversion.",
    format: (v) => formatCurrency(v),
    higherIsBetter: false,
  },
  roas: {
    key: "roas",
    label: "ROAS",
    tooltip: "Return on ad spend: conversion value divided by spend.",
    format: (v) => `${v.toFixed(2)}x`,
    higherIsBetter: true,
  },
  engagement: {
    key: "engagement",
    label: "Engagement",
    tooltip: "Reactions, comments, shares, and other post engagement.",
    format: (v) => formatCompact(v),
    higherIsBetter: true,
  },
  leads: {
    key: "leads",
    label: "Leads",
    tooltip: "Total leads captured (form fills, instant forms, sign-ups).",
    format: (v) => formatNumber(v),
    higherIsBetter: true,
  },
};
