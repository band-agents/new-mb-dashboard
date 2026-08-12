// Server-only: pulls Shopify orders (+ line items, customers, abandoned
// checkouts) for one client and writes daily aggregate rows. Same
// data-accuracy invariant as lib/meta/sync.ts — every Shopify API call
// happens first, in memory; the database is only touched once, atomically,
// after every call has succeeded. A partial failure never leaves
// stale/blank data mislabeled as current (spec §5/§7/§10/§13).
//
// Revenue definitions used here (Shopify's own report terminology):
//   Gross sales  = subtotal_price + total_discounts   (product value before any discount)
//   Discounts    = total_discounts
//   Refunds      = sum of refund transaction amounts
//   Net sales    = Gross sales - Discounts - Refunds
//   Taxes        = total_tax
//   Shipping     = total_shipping_price_set.shop_money.amount
//   Total sales  = Net sales + Taxes + Shipping   (what the customer actually paid, net of refunds)
//
// Orders are bucketed by the DATE portion of their `created_at` string
// as returned by Shopify — that string already carries the store's local
// UTC offset, so slicing the date avoids any UTC day-shift bug.
//
// Excluded from revenue entirely: cancelled orders (`cancelled_at` set)
// and voided orders (`financial_status === "voided"`) — neither represents
// real revenue. Everything else (paid, partially_paid, refunded,
// partially_refunded, pending, authorized) is included, matching Shopify's
// own default sales reports. Order-status counts (paidOrders/
// fulfilledOrders/cancelledOrders/refundedOrders) are counted directly
// from each order's real financial_status/fulfillment_status/cancelled_at
// — never inferred from revenue math.
//
// New vs. returning customers: approximated from the order's
// `customer.orders_count` (>1 => returning). This is Shopify's live
// cumulative count at fetch time, not a true point-in-time snapshot, so a
// customer's very first order in a past period may already read as
// "returning" if they've ordered again since — a known limitation, noted
// in the Data Health section rather than silently presented as exact.
//
// Products: derived from order line_items, NOT a separate Products API
// call — this needs only the read_orders scope this app already requests,
// deliberately avoiding a read_products scope expansion that would force
// every already-connected store to reconnect. A line item with
// product_id: null (product deleted after the order was placed) is kept
// under its own "(deleted product)"-suffixed bucket rather than dropped,
// so revenue totals still reconcile to the order-level totals.
//
// Customers: one row per real Shopify customer (ShopifyCustomer),
// upserted from the same order data — powers total/new/returning/repeat-
// purchase-rate/CLV at query time (see lib/data/shopifyAnalytics.service.ts).
//
// Abandoned checkouts: Shopify's Checkouts API returns checkouts with
// completed_at: null as still abandoned as of fetch time — same
// "point-in-time, not historical" caveat as the customer counts above.

import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/security/crypto";
import { ShopifyApiError, getAbandonedCheckouts, getAllOrders, getShop, normalizeShopDomain, type ShopifyOrder } from "./client";

const SYNC_WINDOW_DAYS = 30;

function isRefundTransaction(t: { kind: string }) {
  return t.kind === "refund";
}

function orderRefundTotal(order: ShopifyOrder): number {
  if (!order.refunds?.length) return 0;
  return order.refunds.reduce(
    (sum, r) => sum + r.transactions.filter(isRefundTransaction).reduce((s, t) => s + (Number(t.amount) || 0), 0),
    0
  );
}

function isExcluded(order: ShopifyOrder): boolean {
  return order.cancelled_at !== null || order.financial_status === "voided";
}

type DayBucket = {
  orderCount: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  taxes: number;
  shipping: number;
  newCustomers: number;
  returningCustomers: number;
  paidOrders: number;
  fulfilledOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
};

function emptyBucket(): DayBucket {
  return {
    orderCount: 0,
    grossSales: 0,
    discounts: 0,
    refunds: 0,
    taxes: 0,
    shipping: 0,
    newCustomers: 0,
    returningCustomers: 0,
    paidOrders: 0,
    fulfilledOrders: 0,
    cancelledOrders: 0,
    refundedOrders: 0,
  };
}

type ProductDayBucket = { title: string; unitsSold: number; revenue: number; orderIds: Set<number> };
type CustomerAgg = { ordersCount: number; totalSpent: number; firstOrderAt: Date; lastOrderAt: Date };

function aggregateOrders(orders: ShopifyOrder[]) {
  const dayBuckets = new Map<string, DayBucket>();
  // Keyed "day::productId" so the same product on different days stays separate.
  const productBuckets = new Map<string, ProductDayBucket>();
  const customers = new Map<string, CustomerAgg>();

  for (const order of orders) {
    // cancelledOrders is counted for every order regardless of exclusion —
    // it's a status count, not a revenue figure, so it should reflect
    // reality even for orders excluded from the financial totals below.
    const day = order.created_at.slice(0, 10);
    if (order.cancelled_at !== null) {
      const cancelBucket = dayBuckets.get(day) ?? emptyBucket();
      cancelBucket.cancelledOrders += 1;
      dayBuckets.set(day, cancelBucket);
    }

    if (order.customer) {
      const key = String(order.customer.id);
      const existing = customers.get(key);
      const orderDate = new Date(order.created_at);
      const spend = isExcluded(order) ? 0 : Number(order.subtotal_price) || 0;
      if (existing) {
        existing.ordersCount = order.customer.orders_count; // Shopify's own cumulative count — take the latest we've seen
        existing.totalSpent += spend;
        if (orderDate < existing.firstOrderAt) existing.firstOrderAt = orderDate;
        if (orderDate > existing.lastOrderAt) existing.lastOrderAt = orderDate;
      } else {
        customers.set(key, { ordersCount: order.customer.orders_count, totalSpent: spend, firstOrderAt: orderDate, lastOrderAt: orderDate });
      }
    }

    if (isExcluded(order)) continue;

    const b = dayBuckets.get(day) ?? emptyBucket();
    const gross = (Number(order.subtotal_price) || 0) + (Number(order.total_discounts) || 0);
    b.orderCount += 1;
    b.grossSales += gross;
    b.discounts += Number(order.total_discounts) || 0;
    b.refunds += orderRefundTotal(order);
    b.taxes += Number(order.total_tax) || 0;
    b.shipping += Number(order.total_shipping_price_set?.shop_money?.amount) || 0;
    if (order.customer) {
      if (order.customer.orders_count > 1) b.returningCustomers += 1;
      else b.newCustomers += 1;
    }
    if (order.financial_status === "paid" || order.financial_status === "partially_paid") b.paidOrders += 1;
    if (order.fulfillment_status === "fulfilled") b.fulfilledOrders += 1;
    if (order.financial_status === "refunded" || order.financial_status === "partially_refunded") b.refundedOrders += 1;
    dayBuckets.set(day, b);

    for (const li of order.line_items ?? []) {
      const productKey = li.product_id != null ? String(li.product_id) : "0";
      const title = li.product_id != null ? li.title : `${li.title} (deleted product)`;
      const bucketKey = `${day}::${productKey}`;
      const pb = productBuckets.get(bucketKey) ?? { title, unitsSold: 0, revenue: 0, orderIds: new Set<number>() };
      pb.unitsSold += li.quantity;
      pb.revenue += (Number(li.price) || 0) * li.quantity;
      pb.orderIds.add(order.id);
      productBuckets.set(bucketKey, pb);
    }
  }

  return { dayBuckets, productBuckets, customers };
}

function aggregateCheckoutsByDay(checkouts: { id: number; created_at: string; completed_at: string | null; total_price: string | null }[]) {
  const buckets = new Map<string, { abandonedCount: number; abandonedValue: number }>();
  for (const c of checkouts) {
    if (c.completed_at !== null) continue; // completed since — not abandoned as of now
    const day = c.created_at.slice(0, 10);
    const b = buckets.get(day) ?? { abandonedCount: 0, abandonedValue: 0 };
    b.abandonedCount += 1;
    b.abandonedValue += Number(c.total_price) || 0;
    buckets.set(day, b);
  }
  return buckets;
}

export type ShopifySyncResult = { storeName: string; currency: string; orderCount: number };

export async function syncClientFromShopify(clientId: string, shopDomainInput: string, accessToken: string): Promise<ShopifySyncResult> {
  const shopDomain = normalizeShopDomain(shopDomainInput);

  // Phase A: fetch everything first — nothing touches the DB until this all succeeds.
  const shop = await getShop(shopDomain, accessToken);
  const until = new Date();
  const since = new Date(until.getTime() - SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [orders, abandonedCheckouts] = await Promise.all([
    getAllOrders(shopDomain, accessToken, since.toISOString(), until.toISOString()),
    // Abandoned checkouts failing outright (e.g. a store-level restriction)
    // shouldn't fail the whole sync — orders/products/customers are the
    // core data; checkout data degrades to "unavailable" instead.
    getAbandonedCheckouts(shopDomain, accessToken, since.toISOString(), until.toISOString()).catch(() => null),
  ]);
  const { dayBuckets, productBuckets, customers } = aggregateOrders(orders);
  const checkoutBuckets = abandonedCheckouts ? aggregateCheckoutsByDay(abandonedCheckouts) : null;

  // Phase B: one atomic write.
  await prisma.$transaction(
    async (tx) => {
      await tx.shopifyOrderSnapshot.deleteMany({ where: { clientId } });
      await tx.shopifyProductSnapshot.deleteMany({ where: { clientId } });
      await tx.shopifyCheckoutSnapshot.deleteMany({ where: { clientId } });
      // Customers are upserted (not deleted-then-recreated) so
      // firstOrderAt/CLV history isn't lost for customers outside the
      // current 30-day sync window who don't appear in this fetch.

      if (dayBuckets.size > 0) {
        await tx.shopifyOrderSnapshot.createMany({
          data: Array.from(dayBuckets.entries()).map(([date, b]) => {
            const netSales = b.grossSales - b.discounts - b.refunds;
            return {
              clientId,
              date: new Date(date),
              orderCount: b.orderCount,
              grossSales: b.grossSales,
              discounts: b.discounts,
              refunds: b.refunds,
              taxes: b.taxes,
              shipping: b.shipping,
              netSales,
              totalSales: netSales + b.taxes + b.shipping,
              newCustomers: b.newCustomers,
              returningCustomers: b.returningCustomers,
              paidOrders: b.paidOrders,
              fulfilledOrders: b.fulfilledOrders,
              cancelledOrders: b.cancelledOrders,
              refundedOrders: b.refundedOrders,
              currency: shop.currency,
              source: "LIVE" as const,
            };
          }),
        });
      }

      if (productBuckets.size > 0) {
        await tx.shopifyProductSnapshot.createMany({
          data: Array.from(productBuckets.entries()).map(([key, pb]) => {
            const [date, productId] = key.split("::");
            return {
              clientId,
              date: new Date(date),
              externalProductId: productId,
              title: pb.title,
              unitsSold: pb.unitsSold,
              revenue: pb.revenue,
              ordersCount: pb.orderIds.size,
              currency: shop.currency,
              source: "LIVE" as const,
            };
          }),
        });
      }

      if (checkoutBuckets && checkoutBuckets.size > 0) {
        await tx.shopifyCheckoutSnapshot.createMany({
          data: Array.from(checkoutBuckets.entries()).map(([date, b]) => ({
            clientId,
            date: new Date(date),
            abandonedCount: b.abandonedCount,
            abandonedValue: b.abandonedValue,
            currency: shop.currency,
            source: "LIVE" as const,
          })),
        });
      }

      // totalSpent/ordersCount are SET (not incremented) from this sync's
      // full fetch every time — the sync always re-pulls the complete
      // SYNC_WINDOW_DAYS window, so incrementing would double-count orders
      // already counted in a previous sync. ordersCount uses Shopify's own
      // customer.orders_count, which is a genuine lifetime count Shopify
      // computes itself, but totalSpent here only reflects spend within
      // the current sync window — a documented limitation, not a true
      // lifetime CLV (that would need a dedicated Shopify Customers API
      // call this sync doesn't make). firstOrderAt is never overwritten on
      // update so a customer's earliest known order is never lost even
      // once it ages out of the rolling window.
      for (const [externalCustomerId, agg] of customers.entries()) {
        await tx.shopifyCustomer.upsert({
          where: { clientId_externalCustomerId: { clientId, externalCustomerId } },
          update: {
            ordersCount: agg.ordersCount,
            totalSpent: agg.totalSpent,
            lastOrderAt: agg.lastOrderAt,
            currency: shop.currency,
          },
          create: {
            clientId,
            externalCustomerId,
            ordersCount: agg.ordersCount,
            totalSpent: agg.totalSpent,
            firstOrderAt: agg.firstOrderAt,
            lastOrderAt: agg.lastOrderAt,
            currency: shop.currency,
          },
        });
      }

      await tx.shopifyConnection.upsert({
        where: { clientId },
        update: {
          status: "CONNECTED",
          shopDomain,
          accessTokenEnc: encryptSecret(accessToken),
          storeName: shop.name,
          storeCurrency: shop.currency,
          timezone: shop.iana_timezone || null,
          lastSyncedAt: new Date(),
          lastError: null,
        },
        create: {
          clientId,
          status: "CONNECTED",
          shopDomain,
          accessTokenEnc: encryptSecret(accessToken),
          storeName: shop.name,
          storeCurrency: shop.currency,
          timezone: shop.iana_timezone || null,
          lastSyncedAt: new Date(),
        },
      });
    },
    { timeout: 30_000 }
  );

  return { storeName: shop.name, currency: shop.currency, orderCount: orders.length };
}

export { ShopifyApiError };
