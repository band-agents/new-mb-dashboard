// Server-only: Shopify OAuth (Partner/Dev Dashboard app) flow.
// Docs: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
// Verified current against Shopify's 2026 docs param-for-param (see
// app/(dashboard)/[clientId]/account/shopify-connection-card.tsx's header
// comment for context on why this is now the primary connect path).
//
// This is a second, alternative way to connect a client's store — the
// paste-a-token flow in lib/shopify/client.ts (a merchant-generated
// custom-app Admin API token) still works and needs no app credentials at
// all. This flow instead uses a real Dev Dashboard app's Client ID/Secret
// so any client can click "Connect" and approve access via Shopify's own
// consent screen, without generating anything themselves.
//
// Credentials (client_id/secret/redirect_uri) are resolved per-organization
// by lib/shopify/appConfig.ts (dashboard-entered, falling back to env vars)
// and passed in here explicitly — this module never reads env directly, so
// it works identically regardless of which source the credentials came
// from.

import crypto from "node:crypto";
import { env } from "@/lib/env";
import type { ShopifyAppCredentials } from "./appConfig";

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

export function buildAuthorizationUrl(shop: string, state: string, creds: ShopifyAppCredentials): string {
  const params = new URLSearchParams({
    client_id: creds.clientId,
    scope: env.shopify.scopes,
    redirect_uri: creds.redirectUri,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Verifies the `hmac` query param Shopify signs every OAuth callback (and
 * webhook) with, using the app's client secret — proves the request really
 * came from Shopify and wasn't forged. See Shopify's "Verify a request" docs.
 */
export function verifyCallbackHmac(searchParams: URLSearchParams, clientSecret: string): boolean {
  const params = new URLSearchParams(searchParams);
  const hmac = params.get("hmac");
  if (!hmac) return false;
  params.delete("hmac");
  params.delete("signature");

  const message = Array.from(params.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const digest = crypto.createHmac("sha256", clientSecret).update(message).digest("hex");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(hmac, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function exchangeCodeForToken(
  shop: string,
  code: string,
  creds: ShopifyAppCredentials
): Promise<{ accessToken: string; scope: string }> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: creds.clientId, client_secret: creds.clientSecret, code }),
  });
  if (!res.ok) {
    throw new Error(`Shopify token exchange failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; scope: string };
  return { accessToken: data.access_token, scope: data.scope };
}
