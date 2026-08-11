import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getBudgetOverview } from "@/lib/data/budget.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { TrendChart } from "@/components/charts/trend-chart";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/empty-error";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

export default async function BudgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { clientId } = await params;
  await requireClientInScope(clientId);
  const sp = await searchParams;
  const { start, end } = resolvePreset((sp.range as DateRangePreset) || "last_30_days");

  const data = await getBudgetOverview({ clientId, start, end });

  const paceStatus =
    data.paceRatio === null
      ? "unknown"
      : data.paceRatio > 1.15
      ? "over"
      : data.paceRatio < 0.85
      ? "under"
      : "on-track";

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Budget & Spend</h1>
      <p className="mb-4 text-sm text-muted-foreground">Track allocation, pacing, and projected spend for active campaigns.</p>
      <FilterBar showStatusFilter={false} />

      {data.allocatedBudget === 0 ? (
        <EmptyState title="No active campaign budgets" description="Active campaigns with a daily budget will appear here." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Allocated Budget", formatCurrency(data.allocatedBudget)],
              ["Amount Spent", formatCurrency(data.spend)],
              ["Remaining", formatCurrency(Math.max(0, data.remainingBudget))],
              ["Avg. Daily Spend", formatCurrency(data.avgDailySpend)],
              ["Utilization", formatPercent(data.utilization, 1)],
              ["Projected Total", formatCurrency(data.projectedTotalSpend)],
            ].map(([label, value]) => (
              <Card key={label} className="p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
              </Card>
            ))}
          </div>

          <Card className="mt-4 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Budget pacing</h3>
              {paceStatus === "over" && (
                <Badge variant="negative">
                  <AlertTriangle className="h-3 w-3" /> Spending faster than expected
                </Badge>
              )}
              {paceStatus === "under" && (
                <Badge variant="warning">
                  <AlertTriangle className="h-3 w-3" /> Spending slower than expected
                </Badge>
              )}
              {paceStatus === "on-track" && (
                <Badge variant="positive">
                  <CheckCircle2 className="h-3 w-3" /> On track
                </Badge>
              )}
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className={cn(
                  "h-2.5 rounded-full",
                  paceStatus === "over" ? "bg-negative" : paceStatus === "under" ? "bg-warning" : "bg-positive"
                )}
                style={{ width: `${Math.min(100, data.utilization)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {data.daysElapsed} of {data.totalDays} days elapsed · {formatPercent(data.utilization, 1)} of allocated budget spent
              {data.paceRatio !== null && (
                <> · pacing at {(data.paceRatio * 100).toFixed(0)}% of expected spend for this point in the period</>
              )}
            </p>
            {paceStatus === "over" && (
              <p className="mt-2 text-xs text-negative">
                Warning: at the current rate, spend is projected to reach {formatCurrency(data.projectedTotalSpend)}, above the{" "}
                {formatCurrency(data.allocatedBudget)} allocated for this period.
              </p>
            )}
            {paceStatus === "under" && (
              <p className="mt-2 text-xs text-warning">
                Budget is under-pacing — at this rate only {formatCurrency(data.projectedTotalSpend)} of the{" "}
                {formatCurrency(data.allocatedBudget)} allocated will be spent by period end.
              </p>
            )}
          </Card>

          <div className="mt-4">
            <TrendChart title="Daily Spend vs Budget" data={data.series} dataKey="spend" format="currency" color="var(--color-chart-1)" />
          </div>

          <Card className="mt-4 p-4">
            <h3 className="mb-3 text-sm font-semibold">Pacing by campaign</h3>
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Campaign</th>
                    <th className="pb-2 font-medium">Daily Budget</th>
                    <th className="pb-2 font-medium">Allocated</th>
                    <th className="pb-2 font-medium">Spent</th>
                    <th className="pb-2 font-medium">Pace</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perCampaign.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="py-2">{c.name}</td>
                      <td className="py-2">{formatCurrency(c.dailyBudget ?? 0)}</td>
                      <td className="py-2">{formatCurrency(c.allocated)}</td>
                      <td className="py-2">{formatCurrency(c.spend)}</td>
                      <td className="py-2">
                        {c.pace === null ? (
                          "—"
                        ) : (
                          <span
                            className={cn(
                              "font-medium",
                              c.pace > 1.15 ? "text-negative" : c.pace < 0.85 ? "text-warning" : "text-positive"
                            )}
                          >
                            {(c.pace * 100).toFixed(0)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
