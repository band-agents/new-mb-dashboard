import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireClientInScope } from "@/lib/data/scope";
import { buildAuthorizationUrl } from "@/lib/tiktok/oauth";
import { getTikTokAppCredentials } from "@/lib/tiktok/appConfig";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

  const { session } = await requireClientInScope(clientId);

  const creds = await getTikTokAppCredentials(session.user.organizationId);
  if (!creds) {
    return NextResponse.redirect(new URL(`/${clientId}/connections?tiktokError=not_configured`, req.url));
  }

  // nonce protects against CSRF — verified against the cookie on callback.
  const nonce = crypto.randomBytes(16).toString("hex");
  const state = `${clientId}.${nonce}`;
  const authUrl = buildAuthorizationUrl(state, creds);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("tiktok_oauth_nonce", nonce, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
