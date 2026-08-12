"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCompact, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

export type ShopifyTrendPoint = { date: string; [key: string]: string | number };

// Same visual shape as components/charts/trend-chart.tsx, but takes
// `currency` as an explicit prop instead of reading the ad-platform
// CurrencyProvider context — Shopify's store currency can genuinely
// differ from the connected ad account's, so this chart must never guess.
export function ShopifyTrendChart({
  title,
  description,
  data,
  dataKey,
  color = "var(--color-chart-1)",
  format = "number",
  currency,
  height = 260,
}: {
  title: string;
  description?: string;
  data: ShopifyTrendPoint[];
  dataKey: string;
  color?: string;
  format?: "number" | "currency" | "compact";
  currency: string;
  height?: number;
}) {
  const { intlTag, t } = useLocale();
  const formatValue = (v: number) =>
    format === "currency" ? formatCurrency(v, currency, intlTag) : format === "compact" ? formatCompact(v, intlTag) : formatNumber(v, intlTag);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </CardHeader>
      <div style={{ height }} className="px-2 pb-3">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{t("empty.noData")}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`shopify-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => formatDate(d, intlTag)}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(v: number) => formatValue(v)}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={64}
              />
              <Tooltip
                formatter={(v) => formatValue(Number(v))}
                labelFormatter={(d) => formatDate(d as string, intlTag)}
                contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
              />
              <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#shopify-${dataKey})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
