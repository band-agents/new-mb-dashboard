"use server";

import { revalidatePath } from "next/cache";
import { requireClientInScope } from "@/lib/data/scope";
import { saveTikTokAppConfig, clearTikTokAppConfig, getTikTokAppConfigSummary } from "@/lib/tiktok/appConfig";
import { saveShopifyAppConfig, clearShopifyAppConfig, getShopifyAppConfigSummary } from "@/lib/shopify/appConfig";

export type SaveTikTokAppConfigResult = { ok: true } | { ok: false; error: string };

/**
 * Lets an org owner enter their TikTok Developer App's Client ID / Client
 * Secret / Redirect URI from the dashboard instead of only server env vars
 * (see lib/tiktok/appConfig.ts). The secret is encrypted before it's ever
 * written to the database and is never echoed back in this action's return
 * value — only ok/error. Client Secret can be left blank on an edit to
 * keep the previously-stored secret unchanged.
 */
export async function saveTikTokAppConfigAction(
  clientIdForRedirect: string,
  formData: FormData
): Promise<SaveTikTokAppConfigResult> {
  const { session } = await requireClientInScope(clientIdForRedirect);
  if (session.user.role !== "OWNER") {
    return { ok: false, error: "Only the organization owner can configure TikTok API credentials." };
  }

  const tiktokClientId = String(formData.get("tiktokClientId") ?? "").trim();
  const tiktokClientSecret = String(formData.get("tiktokClientSecret") ?? "").trim();
  const redirectUri = String(formData.get("redirectUri") ?? "").trim();

  if (!tiktokClientId || !redirectUri) {
    return { ok: false, error: "Client ID and Redirect URI are required." };
  }
  if (!/^https?:\/\//i.test(redirectUri)) {
    return { ok: false, error: "Redirect URI must be a full URL starting with http:// or https://." };
  }

  const existing = await getTikTokAppConfigSummary(session.user.organizationId);
  if (!tiktokClientSecret && existing.source !== "DATABASE") {
    return { ok: false, error: "Client Secret is required." };
  }

  try {
    await saveTikTokAppConfig(session.user.organizationId, {
      clientId: tiktokClientId,
      clientSecret: tiktokClientSecret || undefined,
      redirectUri,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save TikTok configuration." };
  }

  revalidatePath(`/${clientIdForRedirect}/connections`);
  return { ok: true };
}

export async function clearTikTokAppConfigAction(clientIdForRedirect: string): Promise<SaveTikTokAppConfigResult> {
  const { session } = await requireClientInScope(clientIdForRedirect);
  if (session.user.role !== "OWNER") {
    return { ok: false, error: "Only the organization owner can remove TikTok API credentials." };
  }

  await clearTikTokAppConfig(session.user.organizationId);
  revalidatePath(`/${clientIdForRedirect}/connections`);
  return { ok: true };
}

export type SaveShopifyAppConfigResult = { ok: true } | { ok: false; error: string };

/**
 * Lets an org owner enter their Shopify Partner/Dev Dashboard app's Client
 * ID / Client Secret / Redirect URI from the dashboard instead of only
 * server env vars (see lib/shopify/appConfig.ts). The secret is encrypted
 * before it's ever written to the database and is never echoed back in
 * this action's return value — only ok/error. Client Secret can be left
 * blank on an edit to keep the previously-stored secret unchanged.
 */
export async function saveShopifyAppConfigAction(
  clientIdForRedirect: string,
  formData: FormData
): Promise<SaveShopifyAppConfigResult> {
  const { session } = await requireClientInScope(clientIdForRedirect);
  if (session.user.role !== "OWNER") {
    return { ok: false, error: "Only the organization owner can configure Shopify API credentials." };
  }

  const shopifyClientId = String(formData.get("shopifyClientId") ?? "").trim();
  const shopifyClientSecret = String(formData.get("shopifyClientSecret") ?? "").trim();
  const redirectUri = String(formData.get("redirectUri") ?? "").trim();

  if (!shopifyClientId || !redirectUri) {
    return { ok: false, error: "Client ID and Redirect URI are required." };
  }
  if (!/^https?:\/\//i.test(redirectUri)) {
    return { ok: false, error: "Redirect URI must be a full URL starting with http:// or https://." };
  }

  const existing = await getShopifyAppConfigSummary(session.user.organizationId);
  if (!shopifyClientSecret && existing.source !== "DATABASE") {
    return { ok: false, error: "Client Secret is required." };
  }

  try {
    await saveShopifyAppConfig(session.user.organizationId, {
      clientId: shopifyClientId,
      clientSecret: shopifyClientSecret || undefined,
      redirectUri,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save Shopify configuration." };
  }

  revalidatePath(`/${clientIdForRedirect}/connections`);
  return { ok: true };
}

export async function clearShopifyAppConfigAction(clientIdForRedirect: string): Promise<SaveShopifyAppConfigResult> {
  const { session } = await requireClientInScope(clientIdForRedirect);
  if (session.user.role !== "OWNER") {
    return { ok: false, error: "Only the organization owner can remove Shopify API credentials." };
  }

  await clearShopifyAppConfig(session.user.organizationId);
  revalidatePath(`/${clientIdForRedirect}/connections`);
  return { ok: true };
}
