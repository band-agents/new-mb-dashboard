// Server-only: Shopify OAuth (Partner Dashboard app) flow.
// Docs: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
//
// This is a second, alternative way to connect a client's store — the
// paste-a-token flow in lib/shopify/client.ts (a merchant-generated
// custom-app Admin API token) still works and needs no app credentials at
// all. This flow instead uses a real Partner Dashboard app's Client
// ID/Secret so any client can click "Connect" and approve access via
// Shopify's own consent screen, without generating anything themselves.

import crypto from "node:crypto";
import { env, isShopifyConfigured } from "@/lib/env";

const SHOP_DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

/** Validates + normalizes a shop domain the way Shopify expects it in OAuth params. */
export function assertValidShopDomain(input: string): string {
  const domain = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const withSuffix = domain.includes(".") ? domain : `${domain}.myshopify.com`;
  if (!SHOP_DOMAIN_RE.test(withSuffix)) {
    throw new Error("That doesn't look like a valid Shopify store domain (expected something like your-store.myshopify.com).");
  }
  return withSuffix;
}

export function buildAuthorizationUrl(shop: string, state: string): string {
  if (!isShopifyConfigured()) {
    throw new Error("SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET are not configured.");
  }
  const params = new URLSearchParams({
    client_id: env.shopify.clientId,
    scope: env.shopify.scopes,
    redirect_uri: env.shopify.redirectUri,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Verifies the `hmac` query param Shopify signs every OAuth callback (and
 * webhook) with, using the app's client secret — proves the request really
 * came from Shopify and wasn't forged. See Shopify's "Verify a request" docs.
 */
export function verifyCallbackHmac(searchParams: URLSearchParams): boolean {
  const params = new URLSearchParams(searchParams);
  const hmac = params.get("hmac");
  if (!hmac) return false;
  params.delete("hmac");
  params.delete("signature");

  const message = Array.from(params.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const digest = crypto.createHmac("sha256", env.shopify.clientSecret).update(message).digest("hex");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(hmac, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function exchangeCodeForToken(shop: string, code: string): Promise<{ accessToken: string; scope: string }> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: env.shopify.clientId, client_secret: env.shopify.clientSecret, code }),
  });
  if (!res.ok) {
    throw new Error(`Shopify token exchange failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; scope: string };
  return { accessToken: data.access_token, scope: data.scope };
}
