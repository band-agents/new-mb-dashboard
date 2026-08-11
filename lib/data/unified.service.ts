// Combines Meta ad performance with real Shopify order data into one view.
// Every number here is traceable to exactly one source (labeled in the
// return shape) — nothing here fabricates a value neither source actually
// reported. See getReconciliation() for the Meta-vs-Shopify comparison
// required by spec §9 ("Data Health").

import { prisma } from "@/lib/prisma";
import { getInsightRows } from "./insights";
import { aggregate } from "./metrics";

export type UnifiedParams = { clientId: string; start: Date; end: Date };

export type SourceAvailability = "available" | "not_connected" | "no_data";

export async function getUnifiedOverview(params: UnifiedParams) {
  const [metaConnection, shopifyConnection, adAccount] = await Promise.all([
    prisma.metaConnection.findUnique({ where: { clientId: params.clientId } }),
    prisma.shopifyConnection.findUnique({ where: { clientId: params.clientId } }),
    prisma.adAccount.findFirst({ where: { clientId: params.clientId, adPlatform: "META" } }),
  ]);

  const metaRows = await getInsightRows({ clientId: params.clientId, start: params.start, end: params.end, level: "CAMPAIGN", platform: "META" });
  const meta = aggregate(metaRows);
  const metaAvailable: SourceAvailability = !metaConnection && metaRows.length === 0
    ? "not_connected"
    : metaRows.length === 0
      ? "no_data"
      : "available";

  const shopifyRows = await prisma.shopifyOrderSnapshot.findMany({
    where: { clientId: params.clientId, date: { gte: params.start, lte: params.end } },
  });
  const shopify = shopifyRows.reduce(
    (acc, r) => ({
      orderCount: acc.orderCount + r.orderCount,
      grossSales: acc.grossSales + r.grossSales,
      discounts: acc.discounts + r.discounts,
      refunds: acc.refunds + r.refunds,
      taxes: acc.taxes + r.taxes,
      shipping: acc.shipping + r.shipping,
      netSales: acc.netSales + r.netSales,
      totalSales: acc.totalSales + r.totalSales,
      newCustomers: acc.newCustomers + r.newCustomers,
      returningCustomers: acc.returningCustomers + r.returningCustomers,
    }),
    { orderCount: 0, grossSales: 0, discounts: 0, refunds: 0, taxes: 0, shipping: 0, netSales: 0, totalSales: 0, newCustomers: 0, returningCustomers: 0 }
  );
  const shopifyAvailable: SourceAvailability = !shopifyConnection || shopifyConnection.status !== "CONNECTED"
    ? "not_connected"
    : shopifyRows.length === 0
      ? "no_data"
      : "available";

  const metaCurrency = adAccount?.currency ?? "USD";
  const shopifyCurrency = shopifyConnection?.storeCurrency ?? null;
  const currencyMismatch = !!shopifyCurrency && shopifyCurrency !== metaCurrency;

  // Every ratio below is (Shopify $ / Meta $ or count) — only meaningful when both sources have data
  // for the same period AND report in the same currency (no auto-conversion, per spec §2).
  const bothAvailable = metaAvailable === "available" && shopifyAvailable === "available";
  const safeDiv = (a: number, b: number) => (b > 0 ? a / b : null);

  return {
    dateRange: { start: params.start, end: params.end },
    meta: { ...meta, currency: metaCurrency, availability: metaAvailable },
    shopify: { ...shopify, currency: shopifyCurrency ?? metaCurrency, availability: shopifyAvailable },
    currencyMismatch,
    unified: bothAvailable && !currencyMismatch
      ? {
          adSpend: meta.spend,
          shopifyRevenue: shopify.netSales,
          orders: shopify.orderCount,
          averageOrderValue: safeDiv(shopify.totalSales, shopify.orderCount),
          costPerPurchase: safeDiv(meta.spend, shopify.orderCount),
          roas: safeDiv(shopify.netSales, meta.spend),
          revenuePerAdSpend: safeDiv(shopify.netSales, meta.spend),
          customerAcquisitionCost: safeDiv(meta.spend, shopify.newCustomers),
          conversionRate: safeDiv(shopify.orderCount, meta.linkClicks) != null ? safeDiv(shopify.orderCount, meta.linkClicks)! * 100 : null,
          newCustomers: shopify.newCustomers,
          returningCustomers: shopify.returningCustomers,
        }
      : null,
  };
}

export type ReconciliationStatus = "verified" | "difference_detected" | "data_unavailable";

export async function getReconciliation(params: UnifiedParams) {
  const [metaRows, shopifyRows] = await Promise.all([
    getInsightRows({ clientId: params.clientId, start: params.start, end: params.end, level: "CAMPAIGN", platform: "META" }),
    prisma.shopifyOrderSnapshot.findMany({ where: { clientId: params.clientId, date: { gte: params.start, lte: params.end } } }),
  ]);

  const metaPurchases = metaRows.length ? aggregate(metaRows).purchases : null;
  const shopifyOrders = shopifyRows.length ? shopifyRows.reduce((s, r) => s + r.orderCount, 0) : null;

  let status: ReconciliationStatus;
  let differencePercent: number | null = null;

  if (metaPurchases === null || shopifyOrders === null) {
    status = "data_unavailable";
  } else {
    const denom = Math.max(metaPurchases, shopifyOrders, 1);
    differencePercent = (Math.abs(metaPurchases - shopifyOrders) / denom) * 100;
    status = differencePercent <= 15 ? "verified" : "difference_detected";
  }

  return { metaPurchases, shopifyOrders, differencePercent, status };
}
