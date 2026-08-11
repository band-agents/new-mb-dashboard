"use client";

import { useMemo, useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TrendChart, type TrendFormat, type TrendPoint } from "@/components/charts/trend-chart";
import { METRIC_DEFS, type MetricKey } from "@/lib/metricDefs";

type SeriesPoint = {
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  leads: number;
  purchases: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  costPerConversion: number;
  frequency: number;
};

const METRIC_TO_FORMAT: Record<MetricKey, TrendFormat> = {
  spend: "currency",
  impressions: "compact",
  reach: "compact",
  frequency: "decimal",
  clicks: "compact",
  ctr: "percent",
  cpc: "currency",
  cpm: "currency",
  conversions: "number",
  conversionValue: "currency",
  costPerConversion: "currency",
  roas: "decimal",
  engagement: "compact",
  leads: "number",
};

const SUM_KEYS = ["spend", "impressions", "reach", "clicks", "conversions", "conversionValue", "leads", "purchases"] as const;

function bucketKey(date: string, granularity: "daily" | "weekly" | "monthly") {
  if (granularity === "daily") return date;
  const d = new Date(date);
  if (granularity === "monthly") return date.slice(0, 7);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function reaggregate(series: SeriesPoint[], granularity: "daily" | "weekly" | "monthly") {
  if (granularity === "daily") return series;
  const buckets = new Map<string, SeriesPoint[]>();
  for (const p of series) {
    const key = bucketKey(p.date, granularity);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(p);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, points]) => {
      const sums: Record<string, number> = {};
      for (const key of SUM_KEYS) sums[key] = points.reduce((acc, p) => acc + p[key], 0);
      const impressions = sums.impressions || 1;
      const clicks = sums.clicks || 0;
      return {
        date,
        ...sums,
        ctr: (clicks / impressions) * 100,
        cpc: clicks > 0 ? sums.spend / clicks : 0,
        cpm: (sums.spend / impressions) * 1000,
        roas: sums.spend > 0 ? sums.conversionValue / sums.spend : 0,
        costPerConversion: sums.conversions > 0 ? sums.spend / sums.conversions : 0,
        frequency: points.reduce((a, p) => a + p.frequency, 0) / points.length,
      } as SeriesPoint;
    });
}

const METRIC_OPTIONS: MetricKey[] = ["spend", "impressions", "reach", "clicks", "ctr", "cpc", "cpm", "conversions", "conversionValue", "roas"];

export function PerformanceClient({ series }: { series: SeriesPoint[] }) {
  const [metric, setMetric] = useState<MetricKey>("spend");
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("daily");

  const data = useMemo(() => reaggregate(series, granularity), [series, granularity]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRIC_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>
                {METRIC_DEFS[m].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={granularity} onValueChange={(v) => setGranularity(v as typeof granularity)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TrendChart
        title={`${METRIC_DEFS[metric].label} Trend`}
        description={METRIC_DEFS[metric].tooltip}
        data={data as unknown as TrendPoint[]}
        dataKey={metric}
        format={METRIC_TO_FORMAT[metric]}
        height={340}
      />

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <TrendChart title="CTR Trend" data={data as any} dataKey="ctr" format="percent" color="var(--color-chart-2)" />
        <TrendChart title="CPC Trend" data={data as any} dataKey="cpc" format="currency" color="var(--color-chart-3)" />
        <TrendChart title="CPM Trend" data={data as any} dataKey="cpm" format="currency" color="var(--color-chart-5)" />
        <TrendChart title="Reach & Impressions" data={data as any} dataKey="reach" format="compact" color="var(--color-chart-6)" />
      </div>
    </div>
  );
}
