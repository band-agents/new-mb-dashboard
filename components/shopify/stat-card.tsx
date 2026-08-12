"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

// A Shopify-scoped stat card, deliberately NOT sharing components/kpi/kpi-card.tsx
// — that component reads currency from the ad-platform CurrencyProvider
// context (Meta/TikTok), which can genuinely differ from the Shopify
// store's own currency. This card always takes an already-formatted value
// string instead, so there's no way for it to silently apply the wrong
// platform's currency to Shopify money.
export function ShopifyStatCard({
  label,
  value,
  growthPercent,
  higherIsBetter = true,
  emphasize = false,
}: {
  label: string;
  value: string;
  growthPercent?: number | null;
  higherIsBetter?: boolean;
  emphasize?: boolean;
}) {
  const { t } = useLocale();
  const hasGrowth = growthPercent !== undefined && growthPercent !== null;
  const isGood = !hasGrowth ? null : higherIsBetter ? growthPercent! >= 0 : growthPercent! <= 0;

  return (
    <Card className={cn("p-4", emphasize && "ring-1 ring-brand/30")}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
      {hasGrowth && (
        <div
          className={cn(
            "mt-1 inline-flex items-center gap-0.5 text-xs font-medium",
            isGood ? "text-positive" : growthPercent === 0 ? "text-muted-foreground" : "text-negative"
          )}
        >
          {growthPercent! > 0 ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : growthPercent! < 0 ? (
            <ArrowDownRight className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          {Math.abs(growthPercent!).toFixed(1)}%
          <span className="font-normal text-muted-foreground">{t("metrics.vsPrevious")}</span>
        </div>
      )}
    </Card>
  );
}
