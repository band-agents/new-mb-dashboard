import { NextResponse } from "next/server";
import { requireClientInScope } from "@/lib/data/scope";
import { exchangeCodeForToken } from "@/lib/tiktok/oauth";
import { getAuthorizedAdvertisers, TikTokApiError } from "@/lib/tiktok/client";
import { syncClientFromTikTok } from "@/lib/tiktok/sync";
import { encryptSecret } from "@/lib/security/crypto";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const authCode = url.searchParams.get("auth_code") ?? url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const [clientId, nonce] = (state ?? "").split(".");
  if (!clientId) return NextResponse.json({ error: "Missing state" }, { status: 400 });

  const { client } = await requireClientInScope(clientId);

  async function fail(message: string, redirectError: string) {
    await prisma.tikTokConnection.upsert({
      where: { clientId: client.id },
      update: { status: "ERROR", lastError: message },
      create: { clientId: client.id, status: "ERROR", lastError: message },
    });
    return NextResponse.redirect(new URL(`/${client.id}/connections?tiktokError=${redirectError}`, req.url));
  }

  if (oauthError) return fail(oauthError, "oauth_failed");
  if (!authCode) return fail("No authorization code returned by TikTok.", "oauth_failed");

  const cookieStore = req.headers.get("cookie") ?? "";
  const storedNonce = cookieStore.match(/tiktok_oauth_nonce=([^;]+)/)?.[1];
  if (!nonce || !storedNonce || nonce !== storedNonce) {
    return fail("This authorization request expired or could not be verified. Please try connecting again.", "oauth_failed");
  }

  try {
    const { access_token } = await exchangeCodeForToken(authCode);
    const { list } = await getAuthorizedAdvertisers(env.tiktok.clientId, env.tiktok.clientSecret, access_token);

    if (list.length === 0) {
      return fail("This TikTok account has no advertiser accounts to connect. Ask an admin for Ads access on at least one account.", "no_advertisers");
    }

    const res = NextResponse.redirect(
      list.length === 1
        ? new URL(`/${client.id}/connections?tiktokConnected=1`, req.url)
        : new URL(`/${client.id}/connections?tiktokSelectAdvertiser=1`, req.url)
    );
    res.cookies.delete("tiktok_oauth_nonce");

    if (list.length === 1) {
      await syncClientFromTikTok(client.id, access_token, list[0].advertiser_id);
    } else {
      await prisma.tikTokConnection.upsert({
        where: { clientId: client.id },
        update: {
          status: "PENDING_SELECTION",
          accessTokenEnc: encryptSecret(access_token),
          pendingAdvertisersJson: JSON.stringify(list),
          lastError: null,
        },
        create: {
          clientId: client.id,
          status: "PENDING_SELECTION",
          accessTokenEnc: encryptSecret(access_token),
          pendingAdvertisersJson: JSON.stringify(list),
        },
      });
    }

    return res;
  } catch (err) {
    const message =
      err instanceof TikTokApiError ? err.message : err instanceof Error ? err.message : "Something went wrong talking to TikTok.";
    return fail(message, "sync_failed");
  }
}
