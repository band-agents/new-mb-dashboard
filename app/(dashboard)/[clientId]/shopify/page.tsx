import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset, type ComparePreset } from "@/lib/data/dateRange";
import { getClientTimezone } from "@/lib/data/timezone";
import {
  getShopifySalesOverview,
  getShopifyProductsTable,
  getShopifyCustomersOverview,
  getShopifyCheckoutsOverview,
} from "@/lib/data/shopifyAnalytics.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { ShopifyStatCard } from "@/components/shopify/stat-card";
import { ShopifyTrendChart } from "@/components/shopify/shopify-trend-chart";
import { DataTable, rowsToCsv, downloadCsv } from "@/components/tables/data-table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/empty-error";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";
import { intlTag } from "@/lib/i18n/config";
import type { ShopifyProductRow } from "@/lib/data/shopifyAnalytics.service";
import type { ColumnDef } from "@tanstack/react-table";

// Shopify analytics — always visible regardless of the Meta/TikTok
// platform switcher (Shopify isn't an "ad platform" in that sense), so
// this page is not gated by PlatformRequiredNotice.
//
// Every stat/chart here takes Shopify's own store currency explicitly
// (never the ad-platform CurrencyProvider context — see
// components/shopify/stat-card.tsx and shopify-trend-chart.tsx) since the
// two can genuinely differ.
export default async function ShopifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ range?: string; compare?: string }>;
}) {
  const { clientId } = await params;
  await requireClientInScope(clientId);
  const sp = await searchParams;
  const locale = await getLocale();
  const tag = intlTag(locale);
  const range = (sp.range as DateRangePreset) || "last_30_days";
  const compare = (sp.compare as ComparePreset) || "previous_period";
  const timezone = await getClientTimezone(clientId, "SHOPIFY");
  const { start, end } = resolvePreset(range, timezone);

  const [sales, products, customers, checkouts] = await Promise.all([
    getShopifySalesOverview({ clientId, start, end, compare }),
    getShopifyProductsTable({ clientId, start, end, compare }),
    getShopifyCustomersOverview({ clientId, start, end }),
    getShopifyCheckoutsOverview({ clientId, start, end }),
  ]);

  const money = (v: number) => formatCurrency(v, sales.currency, tag);
  const num = (v: number) => formatNumber(v, tag);

  const columns: ColumnDef<ShopifyProductRow>[] = [
    { accessorKey: "title", header: t(locale, "shopify.products.column.product") },
    { accessorKey: "unitsSold", header: t(locale, "shopify.products.column.unitsSold"), cell: ({ getValue }) => num(getValue<number>()) },
    { accessorKey: "ordersCount", header: t(locale, "shopify.products.column.orders"), cell: ({ getValue }) => num(getValue<number>()) },
    { accessorKey: "revenue", header: t(locale, "shopify.products.column.revenue"), cell: ({ getValue }) => money(getValue<number>()) },
    {
      accessorKey: "averageSellingPrice",
      header: t(locale, "shopify.products.column.avgPrice"),
      cell: ({ getValue }) => {
        const v = getValue<number | null>();
        return v !== null ? money(v) : "—";
      },
    },
    {
      accessorKey: "growthPercent",
      header: t(locale, "shopify.products.column.growth"),
      cell: ({ getValue }) => {
        const v = getValue<number | null>();
        if (v === null) return t(locale, "shopify.products.newLabel");
        const cls = v > 0 ? "text-positive" : v < 0 ? "text-negative" : "text-muted-foreground";
        return <span className={cls}>{v > 0 ? "+" : ""}{v.toFixed(1)}%</span>;
      },
    },
  ];

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">{t(locale, "shopify.title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "shopify.subtitle")}</p>
      <FilterBar showStatusFilter={false} />

      {sales.source === "not_connected" ? (
        <Card className="mb-6 flex items-center gap-3 p-4">
          <Info className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t(locale, "shopify.notConnected")}</p>
            <p className="text-xs text-muted-foreground">{t(locale, "shopify.notConnectedDesc")}</p>
          </div>
          <Link href={`/${clientId}/connections`} className="ms-auto shrink-0 text-xs font-medium text-brand underline hover:no-underline">
            {t(locale, "nav.connections")}
          </Link>
        </Card>
      ) : !sales.hasData ? (
        <EmptyState title={t(locale, "shopify.noData")} description={t(locale, "shopify.noDataDesc")} />
      ) : (
        <>
          {/* ---------- Sales & Orders ---------- */}
          <h2 className="mb-2 text-sm font-semibold">{t(locale, "shopify.salesSection")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <ShopifyStatCard label={t(locale, "shopify.metric.revenue")} value={money(sales.current.netSales)} growthPercent={sales.growth?.revenue} />
            <ShopifyStatCard label={t(locale, "shopify.metric.grossSales")} value={money(sales.current.grossSales)} />
            <ShopifyStatCard label={t(locale, "shopify.metric.orders")} value={num(sales.current.orderCount)} growthPercent={sales.growth?.orders} />
            <ShopifyStatCard
              label={t(locale, "shopify.metric.aov")}
              value={sales.current.averageOrderValue !== null ? money(sales.current.averageOrderValue) : "—"}
              growthPercent={sales.growth?.aov}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ShopifyStatCard label={t(locale, "shopify.metric.paidOrders")} value={num(sales.current.paidOrders)} />
            <ShopifyStatCard label={t(locale, "shopify.metric.fulfilledOrders")} value={num(sales.current.fulfilledOrders)} />
            <ShopifyStatCard label={t(locale, "shopify.metric.cancelledOrders")} value={num(sales.current.cancelledOrders)} higherIsBetter={false} />
            <ShopifyStatCard label={t(locale, "shopify.metric.refundedOrders")} value={num(sales.current.refundedOrders)} higherIsBetter={false} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ShopifyStatCard label={t(locale, "shopify.metric.discounts")} value={money(sales.current.discounts)} />
            <ShopifyStatCard label={t(locale, "shopify.metric.taxes")} value={money(sales.current.taxes)} />
            <ShopifyStatCard label={t(locale, "shopify.metric.shipping")} value={money(sales.current.shipping)} />
            <ShopifyStatCard label={t(locale, "shopify.metric.refundAmount")} value={money(sales.current.refunds)} higherIsBetter={false} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ShopifyTrendChart
              title={t(locale, "shopify.chart.revenueTrend")}
              data={sales.series.map((s) => ({ date: s.date, revenue: s.revenue }))}
              dataKey="revenue"
              format="currency"
              currency={sales.currency}
              color="var(--color-chart-1)"
            />
            <ShopifyTrendChart
              title={t(locale, "shopify.chart.ordersTrend")}
              data={sales.series.map((s) => ({ date: s.date, orders: s.orders }))}
              dataKey="orders"
              format="number"
              currency={sales.currency}
              color="var(--color-chart-3)"
            />
            <ShopifyTrendChart
              title={t(locale, "shopify.chart.aovTrend")}
              data={sales.series.map((s) => ({ date: s.date, aov: s.aov }))}
              dataKey="aov"
              format="currency"
              currency={sales.currency}
              color="var(--color-chart-4)"
            />
          </div>

          {/* ---------- Products ---------- */}
          <h2 className="mb-2 mt-8 text-sm font-semibold">{t(locale, "shopify.productsSection")}</h2>
          <p className="mb-3 text-xs text-muted-foreground">{t(locale, "shopify.productsSectionDesc")}</p>
          <DataTable
            columns={columns}
            data={products.rows}
            getSearchText={(r) => r.title}
            searchPlaceholder={t(locale, "shopify.products.search")}
            onExportCsv={(rows) => downloadCsv("shopify-products.csv", rowsToCsv(rows))}
            emptyTitle={t(locale, "empty.noData")}
            emptyDescription={t(locale, "empty.tryDifferentRange")}
          />

          {/* ---------- Customers ---------- */}
          <h2 className="mb-2 mt-8 text-sm font-semibold">{t(locale, "shopify.customersSection")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <ShopifyStatCard label={t(locale, "shopify.metric.newCustomerOrders")} value={num(customers.newCustomerOrders)} />
            <ShopifyStatCard label={t(locale, "shopify.metric.returningCustomerOrders")} value={num(customers.returningCustomerOrders)} />
            <ShopifyStatCard label={t(locale, "shopify.metric.activeCustomers")} value={num(customers.totalActiveCustomers)} />
            <ShopifyStatCard
              label={t(locale, "shopify.metric.repeatPurchaseRate")}
              value={customers.repeatPurchaseRate !== null ? formatPercent(customers.repeatPurchaseRate * 100) : "—"}
            />
            <ShopifyStatCard
              label={t(locale, "shopify.metric.avgCustomerSpend", { days: String(customers.syncWindowDays) })}
              value={customers.averageCustomerSpend !== null ? formatCurrency(customers.averageCustomerSpend, customers.currency, tag) : "—"}
            />
          </div>

          {/* ---------- Abandoned checkouts ---------- */}
          <h2 className="mb-2 mt-8 text-sm font-semibold">{t(locale, "shopify.checkoutsSection")}</h2>
          {!checkouts.hasData ? (
            <p className="text-xs text-muted-foreground">{t(locale, "shopify.checkoutsUnavailable")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <ShopifyStatCard label={t(locale, "shopify.metric.abandonedCheckouts")} value={num(checkouts.abandonedCount)} higherIsBetter={false} />
              <ShopifyStatCard
                label={t(locale, "shopify.metric.abandonedValue")}
                value={formatCurrency(checkouts.abandonedValue, checkouts.currency, tag)}
                higherIsBetter={false}
              />
              <ShopifyStatCard
                label={t(locale, "shopify.metric.abandonmentRate")}
                value={checkouts.approximateAbandonmentRate !== null ? formatPercent(checkouts.approximateAbandonmentRate * 100) : "—"}
                higherIsBetter={false}
              />
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{t(locale, "shopify.abandonmentRateNote")}</p>

          {/* ---------- Not available ---------- */}
          <div className="mt-6 flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t(locale, "shopify.notAvailableNote")}</span>
          </div>

          {sales.lastSyncedAt && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t(locale, "common.lastSynced")} {new Date(sales.lastSyncedAt).toLocaleString(tag)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
