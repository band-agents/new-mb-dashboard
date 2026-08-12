import { NextResponse } from "next/server";
import { requireClientInScope } from "@/lib/data/scope";
import { buildAuthorizationUrl } from "@/lib/meta/oauth";
import { isMetaConfigured } from "@/lib/env";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

  await requireClientInScope(clientId);

  if (!isMetaConfigured()) {
    return NextResponse.redirect(new URL(`/${clientId}/connections?error=not_configured`, req.url));
  }

  // state carries the clientId through the OAuth round trip; in production this
  // should also be a signed/opaque token to prevent CSRF.
  const authUrl = buildAuthorizationUrl(clientId);
  return NextResponse.redirect(authUrl);
}
