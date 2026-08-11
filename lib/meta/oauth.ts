// Server-only: Meta Login / OAuth flow for the Marketing API.
// Docs: https://developers.facebook.com/docs/facebook-login/guides/access-tokens

import { env, isMetaConfigured } from "@/lib/env";

const REQUIRED_SCOPES = ["ads_read", "ads_management", "business_management", "read_insights"];

export function buildAuthorizationUrl(state: string): string {
  if (!isMetaConfigured()) {
    throw new Error("META_APP_ID / META_APP_SECRET are not configured.");
  }
  const params = new URLSearchParams({
    client_id: env.meta.appId,
    redirect_uri: env.meta.redirectUri,
    state,
    scope: REQUIRED_SCOPES.join(","),
    response_type: "code",
  });
  return `https://www.facebook.com/${env.meta.apiVersion}/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  expiresInSeconds: number | null;
}> {
  if (!isMetaConfigured()) {
    throw new Error("META_APP_ID / META_APP_SECRET are not configured.");
  }
  const params = new URLSearchParams({
    client_id: env.meta.appId,
    client_secret: env.meta.appSecret,
    redirect_uri: env.meta.redirectUri,
    code,
  });
  const res = await fetch(
    `https://graph.facebook.com/${env.meta.apiVersion}/oauth/access_token?${params.toString()}`
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta token exchange failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  return { accessToken: data.access_token, expiresInSeconds: data.expires_in ?? null };
}

/** Exchanges a short-lived token for a long-lived one (~60 days). */
export async function getLongLivedToken(shortLivedToken: string) {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: env.meta.appId,
    client_secret: env.meta.appSecret,
    fb_exchange_token: shortLivedToken,
  });
  const res = await fetch(
    `https://graph.facebook.com/${env.meta.apiVersion}/oauth/access_token?${params.toString()}`
  );
  if (!res.ok) throw new Error(`Long-lived token exchange failed: ${await res.text()}`);
  return (await res.json()) as { access_token: string; expires_in: number };
}
