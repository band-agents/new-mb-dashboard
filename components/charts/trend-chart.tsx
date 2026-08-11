"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCompact, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { useCurrency } from "@/components/currency/currency-provider";

export type TrendPoint = { date: string; [key: string]: string | number };

export type TrendFormat = "number" | "currency" | "compact" | "percent" | "decimal";

function formatByKind(kind: TrendFormat, v: number, currency: string, locale: string): string {
  switch (kind) {
    case "currency":
      return formatCurrency(v, currency, locale);
    case "compact":
      return formatCompact(v, locale);
    case "percent":
      return `${v.toFixed(1)}%`;
    case "decimal":
      return v.toFixed(2);
    default:
      return formatNumber(v, locale);
  }
}

export function TrendChart({
  title,
  description,
  data,
  dataKey,
  compareKey,
  color = "var(--color-chart-1)",
  format = "number",
  height = 260,
}: {
  title: string;
  description?: string;
  data: TrendPoint[];
  dataKey: string;
  compareKey?: string;
  color?: string;
  format?: TrendFormat;
  height?: number;
}) {
  const { intlTag, t } = useLocale();
  const currency = useCurrency();
  const formatValue = (v: number) => formatByKind(format, v, currency, intlTag);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </CardHeader>
      <div className="px-2 pb-3" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => formatDate(d, intlTag)}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => formatValue(v)}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(d) => formatDate(d as string, intlTag)}
              formatter={(v) => formatValue(Number(v))}
            />
            {compareKey && <Legend wrapperStyle={{ fontSize: 12 }} />}
            <Area
              type="monotone"
              dataKey={dataKey}
              name={t("common.current")}
              stroke={color}
              strokeWidth={2}
              fill={`url(#fill-${dataKey})`}
              isAnimationActive={false}
            />
            {compareKey && (
              <Area
                type="monotone"
                dataKey={compareKey}
                name={t("common.previousPeriodShort")}
                stroke="var(--color-muted-foreground)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                fill="transparent"
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
