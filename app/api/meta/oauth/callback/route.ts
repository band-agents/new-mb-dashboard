import { NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/meta/oauth";
import { encryptSecret } from "@/lib/security/crypto";
import { prisma } from "@/lib/prisma";
import { requireClientInScope } from "@/lib/data/scope";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const clientId = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (!clientId) return NextResponse.json({ error: "Missing state" }, { status: 400 });

  const { client } = await requireClientInScope(clientId);

  if (oauthError || !code) {
    await prisma.metaConnection.upsert({
      where: { clientId: client.id },
      update: { status: "ERROR", lastError: oauthError ?? "No authorization code returned" },
      create: { clientId: client.id, status: "ERROR", lastError: oauthError ?? "No authorization code returned" },
    });
    return NextResponse.redirect(new URL(`/${client.id}/account?error=oauth_failed`, req.url));
  }

  try {
    const { accessToken, expiresInSeconds } = await exchangeCodeForToken(code);
    await prisma.metaConnection.upsert({
      where: { clientId: client.id },
      update: {
        status: "CONNECTED",
        accessTokenEnc: encryptSecret(accessToken),
        tokenExpiresAt: expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : null,
        lastSyncedAt: new Date(),
        lastError: null,
      },
      create: {
        clientId: client.id,
        status: "CONNECTED",
        accessTokenEnc: encryptSecret(accessToken),
        tokenExpiresAt: expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : null,
        lastSyncedAt: new Date(),
      },
    });
    return NextResponse.redirect(new URL(`/${client.id}/account?connected=1`, req.url));
  } catch (err) {
    await prisma.metaConnection.upsert({
      where: { clientId: client.id },
      update: { status: "ERROR", lastError: err instanceof Error ? err.message : "Unknown error" },
      create: { clientId: client.id, status: "ERROR", lastError: err instanceof Error ? err.message : "Unknown error" },
    });
    return NextResponse.redirect(new URL(`/${client.id}/account?error=token_exchange_failed`, req.url));
  }
}
