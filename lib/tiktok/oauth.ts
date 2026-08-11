// Server-only: TikTok Marketing API advertiser-authorization OAuth flow.
// This is NOT TikTok Login Kit (developers.tiktok.com) — it's the separate
// Business API advertiser-authorization flow (business-api.tiktok.com),
// which does not use the 24h-token/1yr-refresh model that product has.
//
// Flow: advertiser is sent to the TikTok authorization portal; TikTok
// redirects back with `auth_code` + `state`; the code is exchanged
// server-side (with the app secret) for a long-lived access token that
// covers every advertiser account the user grants.

import { env, isTikTokConfigured } from "@/lib/env";
import { exchangeCodeForToken as apiExchangeCodeForToken } from "./client";

export function buildAuthorizationUrl(state: string): string {
  if (!isTikTokConfigured()) {
    throw new Error("TIKTOK_CLIENT_ID / TIKTOK_CLIENT_SECRET are not configured.");
  }
  const params = new URLSearchParams({
    app_id: env.tiktok.clientId,
    state,
    redirect_uri: env.tiktok.redirectUri,
  });
  return `https://business-api.tiktok.com/portal/auth?${params.toString()}`;
}

export async function exchangeCodeForToken(authCode: string) {
  return apiExchangeCodeForToken(env.tiktok.clientId, env.tiktok.clientSecret, authCode);
}
