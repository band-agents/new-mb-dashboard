// Server-only: thin wrapper around the Shopify Admin REST API.
//
// Auth model: this client just takes whatever Admin API access token it's
// given and calls the REST API with it — it doesn't care how the token was
// obtained. Two flows produce one (see lib/shopify/oauth.ts for the OAuth
// path, and account/actions.ts's connectShopifyWithTokenAction for the
// paste-a-token path): Shopify deprecated the old "API credentials" tab
// that let a merchant copy a static token straight out of their admin, so
// OAuth (Authorization Code Grant, verified current against Shopify's
// 2026 docs) is now the only flow that reliably works for a brand-new
// custom app; the paste-token path is kept only for stores that already
// have a still-valid legacy token. The token is encrypted at rest
// (lib/security/crypto.ts) and never sent to the browser.

import { env } from "@/lib/env";

const API_VERSION = env.shopify.apiVersion;

export class ShopifyApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public isRateLimited = false
  ) {
    super(message);
    this.name = "ShopifyApiError";
  }
}

/** Normalizes whatever the user pastes ("my-store", "my-store.myshopify.com", a full URL) into a bare *.myshopify.com host. */
export function normalizeShopDomain(input: string): string {
  let domain = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!domain.includes(".")) domain = `${domain}.myshopify.com`;
  return domain;
}

async function shopifyFetch<T>(
  shopDomain: string,
  path: string,
  accessToken: string,
  searchParams: Record<string, string> = {}
): Promise<{ json: T; linkHeader: string | null }> {
  const url = new URL(`https://${shopDomain}/admin/api/${API_VERSION}${path}`);
  for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const isRateLimited = res.status === 429;
    const message =
      res.status === 401 || res.status === 403
        ? "This Shopify token is invalid, expired, or missing the required scopes (read_orders, read_customers)."
        : isRateLimited
          ? "Shopify API rate limit reached."
          : `Shopify API request failed (${res.status}): ${body.slice(0, 200)}`;
    throw new ShopifyApiError(message, res.status, isRateLimited);
  }

  return { json: (await res.json()) as T, linkHeader: res.headers.get("Link") };
}

export type ShopInfo = { id: number; name: string; currency: string; domain: string; myshopify_domain: string; iana_timezone: string };
export async function getShop(shopDomain: string, accessToken: string) {
  const { json } = await shopifyFetch<{ shop: ShopInfo }>(shopDomain, "/shop.json", accessToken);
  return json.shop;
}

export type ShopifyRefund = { id: number; transactions: { amount: string; kind: string }[] };
export type ShopifyLineItem = {
  product_id: number | null; // null when the original product was later deleted — see lib/shopify/sync.ts for how this is handled
  title: string;
  quantity: number;
  price: string; // per-unit price before discounts, in shop currency
};
export type ShopifyOrder = {
  id: number;
  created_at: string;
  cancelled_at: string | null;
  financial_status: string; // pending | authorized | paid | partially_paid | refunded | partially_refunded | voided
  fulfillment_status: string | null;
  subtotal_price: string;
  total_discounts: string;
  total_tax: string;
  total_shipping_price_set?: { shop_money?: { amount: string } };
  refunds?: ShopifyRefund[];
  customer?: { id: number; orders_count: number } | null;
  line_items?: ShopifyLineItem[];
};

/** Follows Shopify's cursor (Link-header) pagination for any `/x.json` list endpoint, capped at MAX_PAGES as a sane bound for a request-time sync. */
async function getAllPaged<T>(
  shopDomain: string,
  accessToken: string,
  initialPath: string,
  initialParams: Record<string, string>,
  rootKey: string,
  maxPages: number
): Promise<T[]> {
  const results: T[] = [];
  let path = initialPath;
  let params: Record<string, string> | undefined = initialParams;

  for (let page = 0; page < maxPages; page++) {
    const result: { json: Record<string, T[]>; linkHeader: string | null } = await shopifyFetch(shopDomain, path, accessToken, params ?? {});
    results.push(...(result.json[rootKey] ?? []));

    const nextMatch = result.linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    if (!nextMatch) break;
    const nextUrl = new URL(nextMatch[1]);
    path = nextUrl.pathname.replace(/^\/admin\/api\/[^/]+/, "");
    params = Object.fromEntries(nextUrl.searchParams.entries());
  }

  return results;
}

/**
 * Fetches every order in [since, until] via Shopify's cursor (Link-header)
 * pagination, following `next` links until exhausted. Capped at 20 pages
 * (~5,000 orders at the max page size) as a sane bound for a dashboard
 * sync — a store larger than that needs a background job, not a
 * request-time sync (see lib/shopify/sync.ts's docblock).
 */
export function getAllOrders(shopDomain: string, accessToken: string, since: string, until: string): Promise<ShopifyOrder[]> {
  return getAllPaged<ShopifyOrder>(
    shopDomain,
    accessToken,
    "/orders.json",
    {
      status: "any",
      created_at_min: since,
      created_at_max: until,
      limit: "250",
      fields:
        "id,created_at,cancelled_at,financial_status,fulfillment_status,subtotal_price,total_discounts,total_tax,total_shipping_price_set,refunds,customer,line_items",
    },
    "orders",
    20
  );
}

export type ShopifyAbandonedCheckout = {
  id: number;
  created_at: string;
  completed_at: string | null; // null = still abandoned; non-null = later completed, not counted as abandoned
  total_price: string | null;
};

/**
 * Fetches abandoned checkouts (completed_at: null) in [since, until].
 * Confirmed against Shopify's current docs: GET /checkouts.json requires
 * only the read_orders scope — no separate scope needed beyond what this
 * app already requests. Capped at 10 pages (~2,500 rows) — abandoned
 * checkouts are typically a small fraction of order volume.
 */
export function getAbandonedCheckouts(shopDomain: string, accessToken: string, since: string, until: string): Promise<ShopifyAbandonedCheckout[]> {
  return getAllPaged<ShopifyAbandonedCheckout>(
    shopDomain,
    accessToken,
    "/checkouts.json",
    {
      created_at_min: since,
      created_at_max: until,
      limit: "250",
      status: "open", // "open" = not completed = still abandoned as of now
      fields: "id,created_at,completed_at,total_price",
    },
    "checkouts",
    10
  );
}
