"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { BarList } from "@/components/charts/bar-list";
import { EmptyState } from "@/components/states/empty-error";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { useCurrency } from "@/components/currency/currency-provider";
import { useLocale } from "@/components/i18n/locale-provider";

type Row = { segment: string; spend: number; ctr: number; cpc: number; cpm: number; conversions: number; roas: number; impressions: number; reach: number };

const DIMENSIONS = ["ageRange", "gender", "region", "device", "placement"] as const;

function roasIntensity(v: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(1, v / max);
}

export function BreakdownView({ data }: { data: Record<string, Row[]> }) {
  const currency = useCurrency();
  const { intlTag: locale, t } = useLocale();
  const dimLabel = (key: (typeof DIMENSIONS)[number]) =>
    t(`audiences.${key === "ageRange" ? "age" : key === "region" ? "location" : key}`);

  return (
    <Tabs defaultValue="ageRange">
      <TabsList>
        {DIMENSIONS.map((key) => (
          <TabsTrigger key={key} value={key}>
            {dimLabel(key)}
          </TabsTrigger>
        ))}
      </TabsList>

      {DIMENSIONS.map((key) => {
        const rows = data[key] ?? [];
        const label = dimLabel(key);
        const maxRoas = Math.max(0, ...rows.map((r) => r.roas));
        return (
          <TabsContent key={key} value={key}>
            {rows.length === 0 ? (
              <EmptyState title={t("empty.noData")} />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="p-4">
                  <h3 className="mb-3 text-sm font-semibold">{t("kpi.spend")} — {label}</h3>
                  <BarList data={rows} dataKey="spend" labelKey="segment" formatValue={(v) => formatCurrency(v, currency, locale)} />
                </Card>
                <Card className="p-4">
                  <h3 className="mb-3 text-sm font-semibold">{label}</h3>
                  <div className="scroll-thin overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="pb-2 font-medium">{label}</th>
                          <th className="pb-2 font-medium">{t("kpi.spend")}</th>
                          <th className="pb-2 font-medium">{t("kpi.ctr")}</th>
                          <th className="pb-2 font-medium">{t("kpi.cpc")}</th>
                          <th className="pb-2 font-medium">{t("kpi.conversions")}</th>
                          <th className="pb-2 font-medium">{t("kpi.roas")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => {
                          const intensity = roasIntensity(r.roas, maxRoas);
                          return (
                            <tr key={r.segment} className="border-t border-border">
                              <td className="py-2">{r.segment}</td>
                              <td className="py-2">{formatCurrency(r.spend, currency, locale)}</td>
                              <td className="py-2">{formatPercent(r.ctr)}</td>
                              <td className="py-2">{formatCurrency(r.cpc, currency, locale)}</td>
                              <td className="py-2">{r.conversions}</td>
                              <td className="py-2">
                                <span
                                  className={cn(
                                    "inline-block rounded px-1.5 py-0.5 font-medium",
                                    intensity > 0.66
                                      ? "bg-positive-soft text-positive"
                                      : intensity > 0.33
                                      ? "bg-warning-soft text-warning"
                                      : "bg-surface-muted text-muted-foreground"
                                  )}
                                >
                                  {r.roas > 0 ? `${r.roas.toFixed(2)}x` : "—"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
