"use client";

import { Lightbulb, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Insight } from "@/lib/insights/engine";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

const KIND_STYLES: Record<Insight["kind"], { icon: React.ElementType; className: string }> = {
  positive: { icon: TrendingUp, className: "text-positive bg-positive-soft" },
  negative: { icon: TrendingDown, className: "text-negative bg-negative-soft" },
  opportunity: { icon: Lightbulb, className: "text-brand bg-brand-soft" },
  neutral: { icon: AlertCircle, className: "text-muted-foreground bg-surface-muted" },
};

export function InsightCard({ insight }: { insight: Insight }) {
  const { t } = useLocale();
  const { icon: Icon, className } = KIND_STYLES[insight.kind];
  return (
    <Card className="flex gap-3 p-3.5">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", className)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium leading-snug">{insight.title}</p>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{insight.detail}</p>
        {insight.isRecommendation && (
          <Badge variant="outline" className="mt-2">
            {t("alerts.recommendation")}
          </Badge>
        )}
      </div>
    </Card>
  );
}
