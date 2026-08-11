import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireClientInScope } from "@/lib/data/scope";
import { buildAuthorizationUrl } from "@/lib/tiktok/oauth";
import { isTikTokConfigured } from "@/lib/env";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

  await requireClientInScope(clientId);

  if (!isTikTokConfigured()) {
    return NextResponse.redirect(new URL(`/${clientId}/account?tiktokError=not_configured`, req.url));
  }

  // nonce protects against CSRF — verified against the cookie on callback.
  const nonce = crypto.randomBytes(16).toString("hex");
  const state = `${clientId}.${nonce}`;
  const authUrl = buildAuthorizationUrl(state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("tiktok_oauth_nonce", nonce, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
