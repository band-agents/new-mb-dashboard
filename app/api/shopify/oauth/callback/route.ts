import { NextResponse } from "next/server";
import { requireClientInScope } from "@/lib/data/scope";
import { assertValidShopDomain, exchangeCodeForToken, verifyCallbackHmac } from "@/lib/shopify/oauth";
import { getShopifyAppCredentials } from "@/lib/shopify/appConfig";
import { syncClientFromShopify } from "@/lib/shopify/sync";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const shopParam = url.searchParams.get("shop");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const [clientId, nonce] = (state ?? "").split(".");
  if (!clientId) return NextResponse.json({ error: "Missing state" }, { status: 400 });

  const { client, session } = await requireClientInScope(clientId);

  async function fail(message: string, redirectError: string) {
    await prisma.shopifyConnection.upsert({
      where: { clientId: client.id },
      update: { status: "ERROR", lastError: message },
      create: { clientId: client.id, status: "ERROR", lastError: message },
    });
    return NextResponse.redirect(new URL(`/${client.id}/connections?shopifyError=${redirectError}`, req.url));
  }

  if (oauthError) return fail(oauthError, "oauth_failed");
  if (!code || !shopParam) return fail("No authorization code returned by Shopify.", "oauth_failed");

  let shop: string;
  try {
    shop = assertValidShopDomain(shopParam);
  } catch {
    return fail("Invalid shop domain returned by Shopify.", "oauth_failed");
  }

  const creds = await getShopifyAppCredentials(session.user.organizationId);
  if (!creds) {
    // Defensive only — /api/shopify/oauth/start already refuses to build an
    // authorization URL without credentials, so Shopify shouldn't be able
    // to reach this callback in that state.
    return fail("Shopify credentials were removed before this authorization could complete. Please reconnect.", "not_configured");
  }

  if (!verifyCallbackHmac(url.searchParams, creds.clientSecret)) {
    return fail("Could not verify this request came from Shopify (HMAC check failed).", "oauth_failed");
  }

  const cookieStore = req.headers.get("cookie") ?? "";
  const storedNonce = cookieStore.match(/shopify_oauth_nonce=([^;]+)/)?.[1];
  if (!nonce || !storedNonce || nonce !== storedNonce) {
    return fail("This authorization request expired or could not be verified. Please try connecting again.", "oauth_failed");
  }

  try {
    const { accessToken } = await exchangeCodeForToken(shop, code, creds);
    await syncClientFromShopify(client.id, shop, accessToken);
    const res = NextResponse.redirect(new URL(`/${client.id}/connections?shopifyConnected=1`, req.url));
    res.cookies.delete("shopify_oauth_nonce");
    return res;
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Something went wrong talking to Shopify.", "sync_failed");
  }
}
