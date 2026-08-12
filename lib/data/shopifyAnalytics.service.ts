// Query-time aggregation for the Shopify analytics section. Every number
// here is summed directly from ShopifyOrderSnapshot / ShopifyProductSnapshot
// / ShopifyCustomer / ShopifyCheckoutSnapshot rows written by
// lib/shopify/sync.ts — nothing here calls the Shopify API directly, and
// nothing here fabricates a value the sync didn't actually capture.
//
// Metrics NOT included, and why (never silently substituted):
//   - Sessions / visitors, storefront conversion rate, add-to-cart rate:
//     not exposed by Shopify's Admin REST/GraphQL API to a standard
//     custom app — that data lives in Shopify's own Analytics product,
//     which requires a different, more restricted API surface this app
//     does not have access to. Surfaced as "unavailable" in the UI, never
//     estimated.
//   - Live inventory / low-stock / out-of-stock: would require the
//     read_products scope, which this app does not currently request
//     (adding it would force every already-connected store to
//     reconnect — see lib/shopify/appConfig.ts). Documented as a
//     configuration limitation, not built.
//   - True lifetime Customer Lifetime Value: ShopifyCustomer.totalSpent
//     only reflects the rolling sync window (see lib/shopify/sync.ts's
//     docblock) — labeled "Avg. Customer Spend (last {N} days)" in the UI,
//     never presented as a true all-time CLV.

import { prisma } from "@/lib/prisma";
import { comparisonRange, type ComparePreset } from "./dateRange";

export type ShopifyParams = { clientId: string; start: Date; end: Date };

const SYNC_WINDOW_DAYS = 30; // must match lib/shopify/sync.ts — documented in the CLV caveat above

function safeDiv(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null; // "infinite growth from zero" is not a meaningful percent — shown as "New" in the UI instead of a number
  return ((current - previous) / previous) * 100;
}

// ---------- Sales & Orders ----------

export async function getShopifySalesOverview(params: ShopifyParams & { compare: ComparePreset }) {
  const connection = await prisma.shopifyConnection.findUnique({ where: { clientId: params.clientId } });
  const isLive = connection?.status === "CONNECTED";

  const rows = await prisma.shopifyOrderSnapshot.findMany({
    where: { clientId: params.clientId, date: { gte: params.start, lte: params.end } },
    orderBy: { date: "asc" },
  });
  type OrderSnapshotRow = (typeof rows)[number];

  const sum = (orderRows: OrderSnapshotRow[]) =>
    orderRows.reduce(
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
        paidOrders: acc.paidOrders + r.paidOrders,
        fulfilledOrders: acc.fulfilledOrders + r.fulfilledOrders,
        cancelledOrders: acc.cancelledOrders + r.cancelledOrders,
        refundedOrders: acc.refundedOrders + r.refundedOrders,
      }),
      {
        orderCount: 0, grossSales: 0, discounts: 0, refunds: 0, taxes: 0, shipping: 0, netSales: 0, totalSales: 0,
        newCustomers: 0, returningCustomers: 0, paidOrders: 0, fulfilledOrders: 0, cancelledOrders: 0, refundedOrders: 0,
      }
    );

  const current = sum(rows);
  const averageOrderValue = safeDiv(current.totalSales, current.orderCount); // AOV = Total Sales / Orders

  let previous: ReturnType<typeof sum> | null = null;
  const prevRange = comparisonRange({ start: params.start, end: params.end }, params.compare);
  if (prevRange) {
    const prevRows = await prisma.shopifyOrderSnapshot.findMany({
      where: { clientId: params.clientId, date: { gte: prevRange.start, lte: prevRange.end } },
    });
    previous = sum(prevRows);
  }

  const currency = rows[0]?.currency ?? connection?.storeCurrency ?? "USD";
  const series = rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    revenue: r.netSales,
    orders: r.orderCount,
    aov: safeDiv(r.totalSales, r.orderCount) ?? 0,
  }));

  return {
    source: isLive ? ("live" as const) : ("not_connected" as const),
    hasData: rows.length > 0,
    currency,
    current: { ...current, averageOrderValue },
    previous: previous ? { ...previous, averageOrderValue: safeDiv(previous.totalSales, previous.orderCount) } : null,
    growth: previous
      ? {
          revenue: pctChange(current.netSales, previous.netSales),
          orders: pctChange(current.orderCount, previous.orderCount),
          aov: pctChange(averageOrderValue ?? 0, previous ? (safeDiv(previous.totalSales, previous.orderCount) ?? 0) : 0),
        }
      : null,
    series,
    lastSyncedAt: connection?.lastSyncedAt?.toISOString() ?? null,
  };
}

// ---------- Products ----------

export type ShopifyProductRow = {
  externalProductId: string;
  title: string;
  unitsSold: number;
  revenue: number;
  ordersCount: number;
  averageSellingPrice: number | null; // revenue / unitsSold
  growthPercent: number | null; // vs. the equivalent previous period, null if not present in either period
};

export async function getShopifyProductsTable(params: ShopifyParams & { compare: ComparePreset }): Promise<{ currency: string; rows: ShopifyProductRow[] }> {
  const [rows, connection] = await Promise.all([
    prisma.shopifyProductSnapshot.findMany({ where: { clientId: params.clientId, date: { gte: params.start, lte: params.end } } }),
    prisma.shopifyConnection.findUnique({ where: { clientId: params.clientId }, select: { storeCurrency: true } }),
  ]);

  // ordersCount is summed per-day-per-product (each ShopifyProductSnapshot
  // row already counts distinct orders for that product on that single
  // day) — safe to sum across days since an order can't span two days.
  const byProduct = new Map<string, { title: string; unitsSold: number; revenue: number; ordersCount: number }>();
  for (const r of rows) {
    const existing = byProduct.get(r.externalProductId) ?? { title: r.title, unitsSold: 0, revenue: 0, ordersCount: 0 };
    existing.unitsSold += r.unitsSold;
    existing.revenue += r.revenue;
    existing.ordersCount += r.ordersCount;
    byProduct.set(r.externalProductId, existing);
  }

  let prevByProduct = new Map<string, { revenue: number }>();
  const prevRange = comparisonRange({ start: params.start, end: params.end }, params.compare);
  if (prevRange) {
    const prevRows = await prisma.shopifyProductSnapshot.findMany({
      where: { clientId: params.clientId, date: { gte: prevRange.start, lte: prevRange.end } },
    });
    for (const r of prevRows) {
      const existing = prevByProduct.get(r.externalProductId) ?? { revenue: 0 };
      existing.revenue += r.revenue;
      prevByProduct.set(r.externalProductId, existing);
    }
  }

  const productRows: ShopifyProductRow[] = Array.from(byProduct.entries())
    .map(([externalProductId, p]) => {
      const prev = prevByProduct.get(externalProductId);
      return {
        externalProductId,
        title: p.title,
        unitsSold: p.unitsSold,
        revenue: p.revenue,
        ordersCount: p.ordersCount,
        averageSellingPrice: safeDiv(p.revenue, p.unitsSold),
        growthPercent: prev ? pctChange(p.revenue, prev.revenue) : null,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return { currency: rows[0]?.currency ?? connection?.storeCurrency ?? "USD", rows: productRows };
}

// ---------- Customers ----------

export async function getShopifyCustomersOverview(params: ShopifyParams) {
  const [orderRows, activeCustomers, connection] = await Promise.all([
    prisma.shopifyOrderSnapshot.findMany({ where: { clientId: params.clientId, date: { gte: params.start, lte: params.end } } }),
    // "Active in period" = ordered at least once with created_at in range — approximated via lastOrderAt
    // falling in range, since ShopifyCustomer only stores the running latest order date, not every order date.
    prisma.shopifyCustomer.findMany({ where: { clientId: params.clientId, lastOrderAt: { gte: params.start, lte: params.end } } }),
    prisma.shopifyConnection.findUnique({ where: { clientId: params.clientId }, select: { storeCurrency: true } }),
  ]);

  const newCustomerOrders = orderRows.reduce((s, r) => s + r.newCustomers, 0);
  const returningCustomerOrders = orderRows.reduce((s, r) => s + r.returningCustomers, 0);

  const totalActiveCustomers = activeCustomers.length;
  const repeatCustomers = activeCustomers.filter((c) => c.ordersCount > 1).length;
  const repeatPurchaseRate = safeDiv(repeatCustomers, totalActiveCustomers);
  const totalSpentSum = activeCustomers.reduce((s, c) => s + c.totalSpent, 0);
  const averageCustomerSpend = safeDiv(totalSpentSum, totalActiveCustomers);

  return {
    currency: connection?.storeCurrency ?? "USD",
    // Order-level classification (matches the definition already used
    // elsewhere in this app, e.g. lib/data/unified.service.ts): counts
    // orders placed by a first-time vs. repeat buyer, not unique people.
    newCustomerOrders,
    returningCustomerOrders,
    // Customer-level classification: unique customers active in this period.
    totalActiveCustomers,
    repeatCustomers,
    repeatPurchaseRate, // fraction 0..1 — multiply by 100 for a percent
    averageCustomerSpend, // scoped to the sync window — see file header
    syncWindowDays: SYNC_WINDOW_DAYS,
  };
}

// ---------- Abandoned checkouts ----------

export async function getShopifyCheckoutsOverview(params: ShopifyParams) {
  const [checkoutRows, orderRows, connection] = await Promise.all([
    prisma.shopifyCheckoutSnapshot.findMany({ where: { clientId: params.clientId, date: { gte: params.start, lte: params.end } } }),
    prisma.shopifyOrderSnapshot.findMany({ where: { clientId: params.clientId, date: { gte: params.start, lte: params.end } }, select: { orderCount: true } }),
    prisma.shopifyConnection.findUnique({ where: { clientId: params.clientId }, select: { storeCurrency: true } }),
  ]);

  const abandonedCount = checkoutRows.reduce((s, r) => s + r.abandonedCount, 0);
  const abandonedValue = checkoutRows.reduce((s, r) => s + r.abandonedValue, 0);
  const completedOrders = orderRows.reduce((s, r) => s + r.orderCount, 0);

  return {
    currency: connection?.storeCurrency ?? "USD",
    hasData: checkoutRows.length > 0,
    abandonedCount,
    abandonedValue,
    // Approximation, clearly labeled: Shopify's Admin API doesn't expose
    // total checkout *attempts* (that's session-level analytics data this
    // app doesn't have access to — see file header). This uses the common
    // proxy formula abandoned / (abandoned + completed), not a true
    // "sessions that reached checkout" rate.
    approximateAbandonmentRate: safeDiv(abandonedCount, abandonedCount + completedOrders),
  };
}
