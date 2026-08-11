"use client";

import { AlertOctagon, AlertTriangle, Info, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { GeneratedAlert } from "@/lib/insights/alerts";
import { useLocale } from "@/components/i18n/locale-provider";

const SEVERITY_STYLE: Record<string, { icon: React.ElementType; badge: "negative" | "warning" | "info"; iconClass: string }> = {
  CRITICAL: { icon: AlertOctagon, badge: "negative", iconClass: "text-negative bg-negative-soft" },
  WARNING: { icon: AlertTriangle, badge: "warning", iconClass: "text-warning bg-warning-soft" },
  INFO: { icon: Info, badge: "info", iconClass: "text-info bg-info-soft" },
};

const SEVERITY_KEY: Record<string, string> = { CRITICAL: "alerts.critical", WARNING: "alerts.warning", INFO: "common.status" };

export function AlertCard({ alert }: { alert: GeneratedAlert }) {
  const { t, intlTag } = useLocale();
  const style = SEVERITY_STYLE[alert.severity] ?? SEVERITY_STYLE.INFO;
  const Icon = alert.type === "OUTPERFORMING" ? TrendingUp : style.icon;

  return (
    <Card className="flex gap-3 p-3.5">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.iconClass}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{alert.title}</p>
          <Badge variant={style.badge}>{t(SEVERITY_KEY[alert.severity] ?? "alerts.warning")}</Badge>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{alert.description}</p>
        <p className="mt-2 text-xs">
          <span className="font-medium text-foreground">{t("alerts.suggestedAction")}: </span>
          <span className="text-muted-foreground">{alert.suggestedAction}</span>
        </p>
        <p className="mt-1.5 text-[11px] text-muted-foreground">{formatDate(alert.date, intlTag)}</p>
      </div>
    </Card>
  );
}
