import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireClientInScope } from "@/lib/data/scope";
import { assertValidShopDomain, buildAuthorizationUrl } from "@/lib/shopify/oauth";
import { isShopifyConfigured } from "@/lib/env";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  const shopInput = url.searchParams.get("shop");
  if (!clientId || !shopInput) return NextResponse.json({ error: "Missing clientId or shop" }, { status: 400 });

  await requireClientInScope(clientId);

  if (!isShopifyConfigured()) {
    return NextResponse.redirect(new URL(`/${clientId}/connections?shopifyError=not_configured`, req.url));
  }

  let shop: string;
  try {
    shop = assertValidShopDomain(shopInput);
  } catch {
    return NextResponse.redirect(new URL(`/${clientId}/connections?shopifyError=invalid_domain`, req.url));
  }

  // nonce protects against CSRF — verified against the cookie on callback, per Shopify's OAuth guide.
  const nonce = crypto.randomBytes(16).toString("hex");
  const state = `${clientId}.${nonce}`;
  const authUrl = buildAuthorizationUrl(shop, state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("shopify_oauth_nonce", nonce, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
