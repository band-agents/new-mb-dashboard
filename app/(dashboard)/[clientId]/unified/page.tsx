import Link from "next/link";
import { AlertTriangle, ShieldCheck, ShoppingBag, XCircle } from "lucide-react";
import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getUnifiedOverview, getReconciliation, type ReconciliationStatus } from "@/lib/data/unified.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";
import { intlTag } from "@/lib/i18n/config";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

const STATUS_BADGE: Record<ReconciliationStatus, { variant: "positive" | "warning" | "neutral"; icon: typeof ShieldCheck }> = {
  verified: { variant: "positive", icon: ShieldCheck },
  difference_detected: { variant: "warning", icon: AlertTriangle },
  data_unavailable: { variant: "neutral", icon: XCircle },
};

export default async function UnifiedPage({
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
  const tag = intlTag(locale);

  const [data, reconciliation] = await Promise.all([
    getUnifiedOverview({ clientId, start, end }),
    getReconciliation({ clientId, start, end }),
  ]);

  const metaMoney = (v: number) => formatCurrency(v, data.meta.currency, tag);
  const tiktokMoney = (v: number) => formatCurrency(v, data.tiktok.currency, tag);
  const shopMoney = (v: number) => formatCurrency(v, data.shopify.currency, tag);
  const adMoney = (v: number) => formatCurrency(v, data.unified?.adSpendCurrency ?? data.meta.currency, tag);
  const num = (v: number) => formatNumber(v, tag);
  const statusBadge = STATUS_BADGE[reconciliation.status];
  const StatusIcon = statusBadge.icon;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">{t(locale, "unified.title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "unified.subtitle")}</p>
      <FilterBar showStatusFilter={false} />

      {data.adCurrencyMismatch && (
        <div className="mb-4 flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {t(locale, "unified.adCurrencyMismatchWarning", {
              metaCurrency: data.meta.currency,
              tiktokCurrency: data.tiktok.currency,
            })}
          </span>
        </div>
      )}

      {data.currencyMismatch && (
        <div className="mb-4 flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {t(locale, "unified.currencyMismatchWarning", {
              shopifyCurrency: data.shopify.currency,
            })}
          </span>
        </div>
      )}

      {data.unified ? (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label={t(locale, "unified.adSpend")} value={adMoney(data.unified.adSpend)} />
          {data.unified.metaSpend !== null && data.unified.tiktokSpend !== null && (
            <>
              <Stat label={t(locale, "unified.metaSpend")} value={metaMoney(data.unified.metaSpend)} />
              <Stat label={t(locale, "unified.tiktokSpend")} value={tiktokMoney(data.unified.tiktokSpend)} />
            </>
          )}
          <Stat label={t(locale, "unified.shopifyRevenue")} value={shopMoney(data.unified.shopifyRevenue)} />
          <Stat label={t(locale, "unified.orders")} value={num(data.unified.orders)} />
          <Stat label={t(locale, "unified.aov")} value={data.unified.averageOrderValue !== null ? shopMoney(data.unified.averageOrderValue) : "—"} />
          <Stat label={t(locale, "unified.costPerPurchase")} value={data.unified.costPerPurchase !== null ? adMoney(data.unified.costPerPurchase) : "—"} />
          <Stat label={t(locale, "unified.roas")} value={data.unified.roas !== null ? `${data.unified.roas.toFixed(2)}x` : "—"} />
          <Stat label={t(locale, "unified.cac")} value={data.unified.customerAcquisitionCost !== null ? adMoney(data.unified.customerAcquisitionCost) : "—"} />
          <Stat label={t(locale, "unified.conversionRate")} value={data.unified.conversionRate !== null ? formatPercent(data.unified.conversionRate) : "—"} />
          <Stat label={t(locale, "unified.newCustomers")} value={num(data.unified.newCustomers)} />
          <Stat label={t(locale, "unified.returningCustomers")} value={num(data.unified.returningCustomers)} />
        </div>
      ) : (
        <Card className="mb-6 flex items-center gap-3 p-4">
          <ShoppingBag className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t(locale, "unified.needBothSources")}</p>
            <p className="text-xs text-muted-foreground">{t(locale, "unified.needBothSourcesDesc")}</p>
          </div>
          <Link href={`/${clientId}/account`} className="ms-auto shrink-0 text-xs font-medium text-brand underline hover:no-underline">
            {t(locale, "account.title")}
          </Link>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t(locale, "unified.metaSection")}</h3>
            <Badge variant={data.meta.availability === "available" ? "positive" : "neutral"}>
              {data.meta.availability === "available" ? t(locale, "common.connected") : data.meta.availability === "not_connected" ? t(locale, "common.notConnected") : t(locale, "empty.noData")}
            </Badge>
          </div>
          {data.meta.availability === "available" ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <span className="text-muted-foreground">{t(locale, "kpi.spend")}</span>
              <span className="text-right font-medium">{metaMoney(data.meta.spend)}</span>
              <span className="text-muted-foreground">{t(locale, "kpi.conversions")}</span>
              <span className="text-right font-medium">{num(data.meta.conversions)}</span>
              <span className="text-muted-foreground">{t(locale, "kpi.purchases")}</span>
              <span className="text-right font-medium">{num(data.meta.purchases)}</span>
              <span className="text-muted-foreground">{t(locale, "kpi.roas")}</span>
              <span className="text-right font-medium">{data.meta.roas > 0 ? `${data.meta.roas.toFixed(2)}x` : "—"}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t(locale, "empty.noData")}</p>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t(locale, "unified.tiktokSection")}</h3>
            <Badge variant={data.tiktok.availability === "available" ? "positive" : "neutral"}>
              {data.tiktok.availability === "available" ? t(locale, "common.connected") : data.tiktok.availability === "not_connected" ? t(locale, "common.notConnected") : t(locale, "empty.noData")}
            </Badge>
          </div>
          {data.tiktok.availability === "available" ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <span className="text-muted-foreground">{t(locale, "kpi.spend")}</span>
              <span className="text-right font-medium">{tiktokMoney(data.tiktok.spend)}</span>
              <span className="text-muted-foreground">{t(locale, "kpi.conversions")}</span>
              <span className="text-right font-medium">{num(data.tiktok.conversions)}</span>
              <span className="text-muted-foreground">{t(locale, "kpi.roas")}</span>
              <span className="text-right font-medium">{data.tiktok.roas > 0 ? `${data.tiktok.roas.toFixed(2)}x` : "—"}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t(locale, "empty.noData")}</p>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t(locale, "unified.shopifySection")}</h3>
            <Badge variant={data.shopify.availability === "available" ? "positive" : "neutral"}>
              {data.shopify.availability === "available" ? t(locale, "common.connected") : data.shopify.availability === "not_connected" ? t(locale, "common.notConnected") : t(locale, "empty.noData")}
            </Badge>
          </div>
          {data.shopify.availability === "available" ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <span className="text-muted-foreground">{t(locale, "unified.orders")}</span>
              <span className="text-right font-medium">{num(data.shopify.orderCount)}</span>
              <span className="text-muted-foreground">{t(locale, "unified.grossSales")}</span>
              <span className="text-right font-medium">{shopMoney(data.shopify.grossSales)}</span>
              <span className="text-muted-foreground">{t(locale, "unified.discounts")}</span>
              <span className="text-right font-medium">{shopMoney(data.shopify.discounts)}</span>
              <span className="text-muted-foreground">{t(locale, "unified.refunds")}</span>
              <span className="text-right font-medium">{shopMoney(data.shopify.refunds)}</span>
              <span className="text-muted-foreground">{t(locale, "unified.netSales")}</span>
              <span className="text-right font-medium">{shopMoney(data.shopify.netSales)}</span>
              <span className="text-muted-foreground">{t(locale, "unified.taxes")}</span>
              <span className="text-right font-medium">{shopMoney(data.shopify.taxes)}</span>
              <span className="text-muted-foreground">{t(locale, "unified.shipping")}</span>
              <span className="text-right font-medium">{shopMoney(data.shopify.shipping)}</span>
              <span className="text-muted-foreground">{t(locale, "unified.totalSales")}</span>
              <span className="text-right font-medium">{shopMoney(data.shopify.totalSales)}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t(locale, "empty.noData")}</p>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t(locale, "unified.dataHealth")}</h3>
          <Badge variant={statusBadge.variant}>
            <StatusIcon className="h-3 w-3" />
            {t(locale, `unified.status${reconciliation.status === "verified" ? "Verified" : reconciliation.status === "difference_detected" ? "DifferenceDetected" : "DataUnavailable"}`)}
          </Badge>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">{t(locale, "unified.dataHealthDesc")}</p>
        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{t(locale, "unified.metaReportedPurchases")}</p>
            <p className="mt-1 text-base font-semibold tabular-nums">{reconciliation.metaPurchases !== null ? num(reconciliation.metaPurchases) : t(locale, "errors.unavailable")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t(locale, "unified.tiktokReportedConversions")}</p>
            <p className="mt-1 text-base font-semibold tabular-nums">{reconciliation.tiktokConversions !== null ? num(reconciliation.tiktokConversions) : t(locale, "errors.unavailable")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t(locale, "unified.shopifyActualOrders")}</p>
            <p className="mt-1 text-base font-semibold tabular-nums">{reconciliation.shopifyOrders !== null ? num(reconciliation.shopifyOrders) : t(locale, "errors.unavailable")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t(locale, "unified.difference")}</p>
            <p className="mt-1 text-base font-semibold tabular-nums">{reconciliation.differencePercent !== null ? formatPercent(reconciliation.differencePercent, 1) : "—"}</p>
          </div>
        </div>
        {reconciliation.status === "difference_detected" && (
          <p className="mt-3 text-xs text-muted-foreground">{t(locale, "unified.reconciliationNote")}</p>
        )}
      </Card>
    </div>
  );
}
