// Server-only: thin wrapper around the Shopify Admin REST API.
// Auth model: a merchant creates a "custom app" in their Shopify admin
// (Settings -> Apps -> Develop apps), grants it read-only order/customer
// scopes, and pastes the generated Admin API access token here — mirrors
// the Meta paste-token flow in lib/meta/. No Shopify Partner OAuth app
// needed. The token is encrypted at rest (lib/security/crypto.ts) and
// never sent to the browser.

const API_VERSION = "2024-10";

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
};

/**
 * Fetches every order in [since, until] via Shopify's cursor (Link-header)
 * pagination, following `next` links until exhausted. Capped at 20 pages
 * (~5,000 orders at the max page size) as a sane bound for a dashboard
 * sync — a store larger than that needs a background job, not a
 * request-time sync (see lib/shopify/sync.ts's docblock).
 */
export async function getAllOrders(shopDomain: string, accessToken: string, since: string, until: string): Promise<ShopifyOrder[]> {
  const orders: ShopifyOrder[] = [];
  const MAX_PAGES = 20;

  let path = "/orders.json";
  let params: Record<string, string> | undefined = {
    status: "any",
    created_at_min: since,
    created_at_max: until,
    limit: "250",
    fields: "id,created_at,cancelled_at,financial_status,fulfillment_status,subtotal_price,total_discounts,total_tax,total_shipping_price_set,refunds,customer",
  };

  for (let page = 0; page < MAX_PAGES; page++) {
    const result: { json: { orders: ShopifyOrder[] }; linkHeader: string | null } = await shopifyFetch(
      shopDomain,
      path,
      accessToken,
      params ?? {}
    );
    orders.push(...result.json.orders);

    const nextMatch = result.linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    if (!nextMatch) break;
    const nextUrl = new URL(nextMatch[1]);
    path = nextUrl.pathname.replace(/^\/admin\/api\/[^/]+/, "");
    params = Object.fromEntries(nextUrl.searchParams.entries());
  }

  return orders;
}
