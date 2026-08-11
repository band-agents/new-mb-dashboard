// Server-only: pulls Shopify orders for one client and writes daily
// aggregate rows into ShopifyOrderSnapshot. Same data-accuracy invariant as
// lib/meta/sync.ts — every Shopify API call happens first, in memory; the
// database is only touched once, atomically, after every call has
// succeeded. A partial failure never leaves stale/blank data mislabeled as
// current (spec §5/§7/§10/§13).
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
// own default sales reports.
//
// New vs. returning customers: approximated from the order's
// `customer.orders_count` (>1 => returning). This is Shopify's live
// cumulative count at fetch time, not a true point-in-time snapshot, so a
// customer's very first order in a past period may already read as
// "returning" if they've ordered again since — a known limitation, noted
// in the Data Health section rather than silently presented as exact.

import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/security/crypto";
import { ShopifyApiError, getAllOrders, getShop, normalizeShopDomain, type ShopifyOrder } from "./client";

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
};

function emptyBucket(): DayBucket {
  return { orderCount: 0, grossSales: 0, discounts: 0, refunds: 0, taxes: 0, shipping: 0, newCustomers: 0, returningCustomers: 0 };
}

function aggregateByDay(orders: ShopifyOrder[]): Map<string, DayBucket> {
  const buckets = new Map<string, DayBucket>();
  for (const order of orders) {
    if (isExcluded(order)) continue;
    const day = order.created_at.slice(0, 10);
    const b = buckets.get(day) ?? emptyBucket();

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
  const orders = await getAllOrders(shopDomain, accessToken, since.toISOString(), until.toISOString());
  const buckets = aggregateByDay(orders);

  // Phase B: one atomic write.
  await prisma.$transaction(
    async (tx) => {
      await tx.shopifyOrderSnapshot.deleteMany({ where: { clientId } });

      if (buckets.size > 0) {
        await tx.shopifyOrderSnapshot.createMany({
          data: Array.from(buckets.entries()).map(([date, b]) => {
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
              currency: shop.currency,
              source: "LIVE" as const,
            };
          }),
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
          lastSyncedAt: new Date(),
        },
      });
    },
    { timeout: 30_000 }
  );

  return { storeName: shop.name, currency: shop.currency, orderCount: orders.length };
}

export { ShopifyApiError };
