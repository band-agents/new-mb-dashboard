"use client";

import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { METRIC_DEFS, type MetricKey } from "@/lib/metricDefs";
import { pctChange, cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { useCurrency } from "@/components/currency/currency-provider";

export function KpiCard({
  metricKey,
  value,
  previousValue,
  sparkline,
  emphasize = false,
}: {
  metricKey: MetricKey;
  value: number;
  previousValue?: number | null;
  sparkline?: number[];
  emphasize?: boolean;
}) {
  const { t, intlTag } = useLocale();
  const currency = useCurrency();
  const def = METRIC_DEFS[metricKey];
  const hasCompare = previousValue !== undefined && previousValue !== null;
  const change = hasCompare ? pctChange(value, previousValue!) : null;
  const isGood = change === null ? null : def.higherIsBetter ? change >= 0 : change <= 0;

  return (
    <Card className={cn("p-4", emphasize && "ring-1 ring-brand/30")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{t(`metrics.${metricKey}.label`)}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/60" />
          </TooltipTrigger>
          <TooltipContent>{t(`metrics.${metricKey}.tooltip`)}</TooltipContent>
        </Tooltip>
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tabular-nums text-foreground">{def.format(value, currency, intlTag)}</div>
          {change !== null && (
            <div
              className={cn(
                "mt-1 inline-flex items-center gap-0.5 text-xs font-medium",
                isGood ? "text-positive" : change === 0 ? "text-muted-foreground" : "text-negative"
              )}
            >
              {change > 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : change < 0 ? (
                <ArrowDownRight className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {Math.abs(change).toFixed(1)}%
              <span className="text-muted-foreground font-normal">{t("metrics.vsPrevious")}</span>
            </div>
          )}
        </div>

        {sparkline && sparkline.length > 1 && (
          <div className="h-10 w-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkline.map((v, i) => ({ i, v }))}>
                <defs>
                  <linearGradient id={`spark-${def.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--color-brand)"
                  strokeWidth={1.5}
                  fill={`url(#spark-${def.key})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
