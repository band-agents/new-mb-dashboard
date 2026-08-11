"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function BarList({
  data,
  dataKey = "spend",
  labelKey = "segment",
  color = "var(--color-chart-1)",
  formatValue = (v: number) => v.toLocaleString(),
  height,
}: {
  data: Record<string, unknown>[];
  dataKey?: string;
  labelKey?: string;
  color?: string;
  formatValue?: (v: number) => string;
  height?: number;
}) {
  const h = height ?? Math.max(160, data.length * 34);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={formatValue} />
        <YAxis
          type="category"
          dataKey={labelKey}
          width={110}
          tick={{ fontSize: 11, fill: "var(--color-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
          formatter={(v) => formatValue(Number(v))}
        />
        <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
