import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { requireClientInScope } from "@/lib/data/scope";
import { getClientCurrency } from "@/lib/data/currency";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getBudgetOverview } from "@/lib/data/budget.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { TrendChart } from "@/components/charts/trend-chart";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/empty-error";
import { PlatformRequiredNotice } from "@/components/platforms/platform-required-notice";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";
import { intlTag } from "@/lib/i18n/config";
import { getPlatform } from "@/lib/platforms/getPlatform";

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
  const locale = await getLocale();
  const platform = await getPlatform();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">{t(locale, "budget.title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "budget.subtitle")}</p>
      <FilterBar showStatusFilter={false} />
      {platform === "ALL" ? (
        <PlatformRequiredNotice />
      ) : (
        <BudgetData clientId={clientId} start={start} end={end} platform={platform} locale={locale} />
      )}
    </div>
  );
}

async function BudgetData({
  clientId,
  start,
  end,
  platform,
  locale,
}: {
  clientId: string;
  start: Date;
  end: Date;
  platform: "META" | "TIKTOK";
  locale: Awaited<ReturnType<typeof getLocale>>;
}) {
  const currency = await getClientCurrency(clientId, platform);
  const tag = intlTag(locale);
  const money = (v: number) => formatCurrency(v, currency, tag);

  const data = await getBudgetOverview({ clientId, start, end, platform });

  if (data.allocatedBudget === 0) {
    return <EmptyState title={t(locale, "empty.noData")} description={t(locale, "empty.tryDifferentRange")} />;
  }

  const paceStatus =
    data.paceRatio === null
      ? "unknown"
      : data.paceRatio > 1.15
      ? "over"
      : data.paceRatio < 0.85
      ? "under"
      : "on-track";

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          [t(locale, "budget.allocated"), money(data.allocatedBudget)],
          [t(locale, "budget.spent"), money(data.spend)],
          [t(locale, "budget.remaining"), money(Math.max(0, data.remainingBudget))],
          [t(locale, "budget.avgDailySpend"), money(data.avgDailySpend)],
          [t(locale, "budget.utilization"), formatPercent(data.utilization, 1)],
          [t(locale, "budget.projectedTotal"), money(data.projectedTotalSpend)],
        ].map(([label, value]) => (
          <Card key={label} className="p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-4 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t(locale, "budget.pacing")}</h3>
          {paceStatus === "over" && (
            <Badge variant="negative">
              <AlertTriangle className="h-3 w-3" /> {t(locale, "budget.overPacing")}
            </Badge>
          )}
          {paceStatus === "under" && (
            <Badge variant="warning">
              <AlertTriangle className="h-3 w-3" /> {t(locale, "budget.underPacing")}
            </Badge>
          )}
          {paceStatus === "on-track" && (
            <Badge variant="positive">
              <CheckCircle2 className="h-3 w-3" /> {t(locale, "budget.onTrack")}
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
          {data.daysElapsed} / {data.totalDays} · {formatPercent(data.utilization, 1)}
          {data.paceRatio !== null && <> · {(data.paceRatio * 100).toFixed(0)}%</>}
        </p>
        {paceStatus === "over" && (
          <p className="mt-2 text-xs text-negative">
            {money(data.projectedTotalSpend)} / {money(data.allocatedBudget)}
          </p>
        )}
        {paceStatus === "under" && (
          <p className="mt-2 text-xs text-warning">
            {money(data.projectedTotalSpend)} / {money(data.allocatedBudget)}
          </p>
        )}
      </Card>

      <div className="mt-4">
        <TrendChart title={t(locale, "budget.title")} data={data.series} dataKey="spend" format="currency" color="var(--color-chart-1)" />
      </div>

      <Card className="mt-4 p-4">
        <h3 className="mb-3 text-sm font-semibold">{t(locale, "budget.pacingByCampaign")}</h3>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-2 font-medium">{t(locale, "campaigns.name")}</th>
                <th className="pb-2 font-medium">{t(locale, "kpi.dailyBudget")}</th>
                <th className="pb-2 font-medium">{t(locale, "budget.allocated")}</th>
                <th className="pb-2 font-medium">{t(locale, "budget.spent")}</th>
                <th className="pb-2 font-medium">{t(locale, "budget.pacing")}</th>
              </tr>
            </thead>
            <tbody>
              {data.perCampaign.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-2">{c.name}</td>
                  <td className="py-2">{money(c.dailyBudget ?? 0)}</td>
                  <td className="py-2">{money(c.allocated)}</td>
                  <td className="py-2">{money(c.spend)}</td>
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
  );
}
