"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { BarList } from "@/components/charts/bar-list";
import { EmptyState } from "@/components/states/empty-error";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

type Row = { segment: string; spend: number; ctr: number; cpc: number; cpm: number; conversions: number; roas: number; impressions: number; reach: number };

const DIMENSIONS: { key: string; label: string }[] = [
  { key: "ageRange", label: "Age" },
  { key: "gender", label: "Gender" },
  { key: "region", label: "Location" },
  { key: "device", label: "Device" },
  { key: "placement", label: "Placement" },
];

function roasIntensity(v: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(1, v / max);
}

export function BreakdownView({ data }: { data: Record<string, Row[]> }) {
  return (
    <Tabs defaultValue="ageRange">
      <TabsList>
        {DIMENSIONS.map((d) => (
          <TabsTrigger key={d.key} value={d.key}>
            {d.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {DIMENSIONS.map((d) => {
        const rows = data[d.key] ?? [];
        const maxRoas = Math.max(0, ...rows.map((r) => r.roas));
        return (
          <TabsContent key={d.key} value={d.key}>
            {rows.length === 0 ? (
              <EmptyState title={`No ${d.label.toLowerCase()} breakdown available`} />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="p-4">
                  <h3 className="mb-3 text-sm font-semibold">Spend by {d.label.toLowerCase()}</h3>
                  <BarList data={rows} dataKey="spend" labelKey="segment" formatValue={(v) => `$${Math.round(v)}`} />
                </Card>
                <Card className="p-4">
                  <h3 className="mb-3 text-sm font-semibold">Performance by {d.label.toLowerCase()}</h3>
                  <div className="scroll-thin overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="pb-2 font-medium">{d.label}</th>
                          <th className="pb-2 font-medium">Spend</th>
                          <th className="pb-2 font-medium">CTR</th>
                          <th className="pb-2 font-medium">CPC</th>
                          <th className="pb-2 font-medium">Conversions</th>
                          <th className="pb-2 font-medium">ROAS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => {
                          const intensity = roasIntensity(r.roas, maxRoas);
                          return (
                            <tr key={r.segment} className="border-t border-border">
                              <td className="py-2">{r.segment}</td>
                              <td className="py-2">{formatCurrency(r.spend)}</td>
                              <td className="py-2">{formatPercent(r.ctr)}</td>
                              <td className="py-2">{formatCurrency(r.cpc)}</td>
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
