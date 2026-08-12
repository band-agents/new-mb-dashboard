// Server-only: TikTok Marketing API advertiser-authorization OAuth flow.
// This is NOT TikTok Login Kit (developers.tiktok.com) — it's the separate
// Business API advertiser-authorization flow (business-api.tiktok.com),
// which does not use the 24h-token/1yr-refresh model that product has.
//
// Flow: advertiser is sent to the TikTok authorization portal; TikTok
// redirects back with `auth_code` + `state`; the code is exchanged
// server-side (with the app secret) for a long-lived access token that
// covers every advertiser account the user grants.
//
// Credentials (app_id/secret/redirect_uri) are resolved per-organization
// by lib/tiktok/appConfig.ts (dashboard-entered, falling back to env vars)
// and passed in here explicitly — this module never reads env directly,
// so it works identically regardless of which source the credentials
// came from.

import type { TikTokAppCredentials } from "./appConfig";
import { exchangeCodeForToken as apiExchangeCodeForToken } from "./client";

export function buildAuthorizationUrl(state: string, creds: TikTokAppCredentials): string {
  const params = new URLSearchParams({
    app_id: creds.clientId,
    state,
    redirect_uri: creds.redirectUri,
  });
  return `https://business-api.tiktok.com/portal/auth?${params.toString()}`;
}

export function exchangeCodeForToken(authCode: string, creds: TikTokAppCredentials) {
  return apiExchangeCodeForToken(creds.clientId, creds.clientSecret, authCode);
}
