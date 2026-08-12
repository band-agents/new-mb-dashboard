// Combines Meta + TikTok ad performance with real Shopify order data into
// one "Business Overview". Every number here is traceable to exactly one
// source (labeled in the return shape) — nothing here fabricates a value no
// source actually reported. See getReconciliation() for the purchases-vs-
// orders comparison required by spec §9 ("Data Health").
//
// Combining rule (same one used by lib/data/combinedAds.service.ts):
// raw counts (spend, conversions, ...) are only summed across ad platforms
// when their currencies match; money is never auto-converted. Meta and
// TikTok are always shown as separate, individually-labeled breakdowns in
// addition to any blended total, so a currency mismatch never hides a
// platform's real numbers.
//
// TikTok's BASIC report does not distinguish "purchases" from other
// conversion events the way Meta's actions[] does (see lib/tiktok/sync.ts).
// So TikTok's conversion count is surfaced as "TikTok reported conversions"
// — never relabeled as "purchases" — and is NOT folded into the Meta-vs-
// Shopify reconciliation math below, since that would silently assume two
// differently-defined metrics are equivalent. It is shown alongside for
// transparency only.

import { prisma } from "@/lib/prisma";
import { getInsightRows } from "./insights";
import { aggregate } from "./metrics";

export type UnifiedParams = { clientId: string; start: Date; end: Date };

export type SourceAvailability = "available" | "not_connected" | "no_data";

export async function getUnifiedOverview(params: UnifiedParams) {
  const [metaConnection, tiktokConnection, shopifyConnection, metaAccount, tiktokAccount] = await Promise.all([
    prisma.metaConnection.findUnique({ where: { clientId: params.clientId } }),
    prisma.tikTokConnection.findUnique({ where: { clientId: params.clientId } }),
    prisma.shopifyConnection.findUnique({ where: { clientId: params.clientId } }),
    prisma.adAccount.findFirst({ where: { clientId: params.clientId, adPlatform: "META" } }),
    prisma.adAccount.findFirst({ where: { clientId: params.clientId, adPlatform: "TIKTOK" } }),
  ]);

  const [metaRows, tiktokRows] = await Promise.all([
    getInsightRows({ clientId: params.clientId, start: params.start, end: params.end, level: "CAMPAIGN", platform: "META" }),
    getInsightRows({ clientId: params.clientId, start: params.start, end: params.end, level: "CAMPAIGN", platform: "TIKTOK" }),
  ]);
  const meta = aggregate(metaRows);
  const tiktok = aggregate(tiktokRows);

  const metaAvailable: SourceAvailability = !metaConnection && metaRows.length === 0
    ? "not_connected"
    : metaRows.length === 0
      ? "no_data"
      : "available";
  const tiktokAvailable: SourceAvailability = !tiktokConnection && tiktokRows.length === 0
    ? "not_connected"
    : tiktokRows.length === 0
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

  const metaCurrency = metaAccount?.currency ?? "USD";
  const tiktokCurrency = tiktokAccount?.currency ?? "USD";
  const shopifyCurrency = shopifyConnection?.storeCurrency ?? null;

  // Step 1: blend the two ad platforms' spend, but only if both are
  // available AND report in the same currency — otherwise keep them
  // separate rather than guessing an exchange rate.
  const adCurrencyMismatch = metaAvailable === "available" && tiktokAvailable === "available" && metaCurrency !== tiktokCurrency;
  let totalAdSpend: number | null = null;
  let totalAdConversionValue: number | null = null;
  let adCurrency: string | null = null;
  if (metaAvailable === "available" && tiktokAvailable === "available" && !adCurrencyMismatch) {
    totalAdSpend = meta.spend + tiktok.spend;
    totalAdConversionValue = meta.conversionValue + tiktok.conversionValue;
    adCurrency = metaCurrency;
  } else if (metaAvailable === "available") {
    totalAdSpend = meta.spend;
    totalAdConversionValue = meta.conversionValue;
    adCurrency = metaCurrency;
  } else if (tiktokAvailable === "available") {
    totalAdSpend = tiktok.spend;
    totalAdConversionValue = tiktok.conversionValue;
    adCurrency = tiktokCurrency;
  }

  // Step 2: blend the ad total with Shopify revenue — only if the blended
  // ad currency (from step 1) matches Shopify's store currency.
  const currencyMismatch = !!shopifyCurrency && !!adCurrency && shopifyCurrency !== adCurrency;

  const bothAvailable = (metaAvailable === "available" || tiktokAvailable === "available") && shopifyAvailable === "available";
  const safeDiv = (a: number, b: number) => (b > 0 ? a / b : null);
  const totalAdLinkClicks = (metaAvailable === "available" ? meta.linkClicks : 0) + (tiktokAvailable === "available" ? tiktok.linkClicks : 0);
  const totalNewCustomers = shopify.newCustomers;

  return {
    dateRange: { start: params.start, end: params.end },
    meta: { ...meta, currency: metaCurrency, availability: metaAvailable },
    tiktok: { ...tiktok, currency: tiktokCurrency, availability: tiktokAvailable },
    shopify: { ...shopify, currency: shopifyCurrency ?? adCurrency ?? "USD", availability: shopifyAvailable },
    adCurrencyMismatch,
    currencyMismatch,
    unified: bothAvailable && !currencyMismatch && totalAdSpend !== null
      ? {
          adSpend: totalAdSpend,
          adSpendCurrency: adCurrency!,
          metaSpend: metaAvailable === "available" ? meta.spend : null,
          tiktokSpend: tiktokAvailable === "available" ? tiktok.spend : null,
          shopifyRevenue: shopify.netSales,
          orders: shopify.orderCount,
          averageOrderValue: safeDiv(shopify.totalSales, shopify.orderCount),
          costPerPurchase: safeDiv(totalAdSpend, shopify.orderCount),
          roas: safeDiv(shopify.netSales, totalAdSpend),
          revenuePerAdSpend: safeDiv(shopify.netSales, totalAdSpend),
          customerAcquisitionCost: safeDiv(totalAdSpend, totalNewCustomers),
          conversionRate: safeDiv(shopify.orderCount, totalAdLinkClicks) != null ? safeDiv(shopify.orderCount, totalAdLinkClicks)! * 100 : null,
          newCustomers: shopify.newCustomers,
          returningCustomers: shopify.returningCustomers,
        }
      : null,
  };
}

export type ReconciliationStatus = "verified" | "difference_detected" | "data_unavailable";

export async function getReconciliation(params: UnifiedParams) {
  const [metaRows, tiktokRows, shopifyRows] = await Promise.all([
    getInsightRows({ clientId: params.clientId, start: params.start, end: params.end, level: "CAMPAIGN", platform: "META" }),
    getInsightRows({ clientId: params.clientId, start: params.start, end: params.end, level: "CAMPAIGN", platform: "TIKTOK" }),
    prisma.shopifyOrderSnapshot.findMany({ where: { clientId: params.clientId, date: { gte: params.start, lte: params.end } } }),
  ]);

  const metaPurchases = metaRows.length ? aggregate(metaRows).purchases : null;
  // TikTok's BASIC report doesn't split purchases out of "conversions" —
  // this is a distinct metric shown for transparency, never treated as
  // equivalent to Meta's "purchases" or Shopify's "orders" (see file header).
  const tiktokConversions = tiktokRows.length ? aggregate(tiktokRows).conversions : null;
  const shopifyOrders = shopifyRows.length ? shopifyRows.reduce((s, r) => s + r.orderCount, 0) : null;

  // Reconciliation math intentionally stays Meta-vs-Shopify only: both
  // report a well-defined "completed purchase" count. Folding TikTok's
  // conversions into this difference% would assume a definitional
  // equivalence the API doesn't guarantee (see file header note).
  let status: ReconciliationStatus;
  let differencePercent: number | null = null;

  if (metaPurchases === null || shopifyOrders === null) {
    status = "data_unavailable";
  } else {
    const denom = Math.max(metaPurchases, shopifyOrders, 1);
    differencePercent = (Math.abs(metaPurchases - shopifyOrders) / denom) * 100;
    status = differencePercent <= 15 ? "verified" : "difference_detected";
  }

  return { metaPurchases, tiktokConversions, shopifyOrders, differencePercent, status };
}
