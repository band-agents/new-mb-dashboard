// Server-only: resolves the Shopify Partner/Dev Dashboard app credentials
// (Client ID / Client Secret / Redirect URI) this organization's OAuth flow
// should use. Mirrors lib/tiktok/appConfig.ts exactly.
//
// Two sources, checked in order:
//   1. ShopifyAppConfig — entered from the dashboard's Connections page,
//      one row per Organization. clientSecretEnc is AES-256-GCM ciphertext
//      (lib/security/crypto.ts), same convention as every access token in
//      this schema. clientId is stored in plaintext because it isn't a
//      secret — Shopify itself puts it in the browser's address bar as
//      part of the authorization redirect.
//   2. env.shopify (SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET /
//      SHOPIFY_REDIRECT_URI) — a deployment-level fallback for ops-managed
//      setups. Never required once a ShopifyAppConfig row exists.
//
// Nothing here may be imported from a Client Component. Every exported
// function that could leak the secret returns either the resolved
// credentials (server-only call sites: OAuth start/callback routes) or a
// UI-safe summary that only ever contains clientId/redirectUri — never the
// secret's plaintext or ciphertext value.

import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";
import { env } from "@/lib/env";

export type ShopifyAppCredentials = { clientId: string; clientSecret: string; redirectUri: string };

export type ShopifyAppConfigSummary =
  | { source: "DATABASE"; clientId: string; redirectUri: string }
  | { source: "ENV"; clientId: string; redirectUri: string }
  | { source: "NONE" };

/** The real credentials to use for this organization's Shopify OAuth flow, or null if nothing is configured anywhere. */
export async function getShopifyAppCredentials(organizationId: string): Promise<ShopifyAppCredentials | null> {
  const row = await prisma.shopifyAppConfig.findUnique({ where: { organizationId } });
  if (row) {
    const clientSecret = decryptSecret(row.clientSecretEnc);
    if (clientSecret) return { clientId: row.clientId, clientSecret, redirectUri: row.redirectUri };
  }
  if (env.shopify.clientId && env.shopify.clientSecret) {
    return { clientId: env.shopify.clientId, clientSecret: env.shopify.clientSecret, redirectUri: env.shopify.redirectUri };
  }
  return null;
}

export async function isShopifyConfiguredForOrg(organizationId: string): Promise<boolean> {
  return (await getShopifyAppCredentials(organizationId)) !== null;
}

/** UI-safe summary for rendering the Connections page — never includes the secret in any form. */
export async function getShopifyAppConfigSummary(organizationId: string): Promise<ShopifyAppConfigSummary> {
  const row = await prisma.shopifyAppConfig.findUnique({ where: { organizationId } });
  if (row) return { source: "DATABASE", clientId: row.clientId, redirectUri: row.redirectUri };
  if (env.shopify.clientId && env.shopify.clientSecret) {
    return { source: "ENV", clientId: env.shopify.clientId, redirectUri: env.shopify.redirectUri };
  }
  return { source: "NONE" };
}

/**
 * clientSecret is optional on update: leaving it blank when a row already
 * exists keeps the previously-stored (encrypted) secret unchanged, so
 * editing just the Client ID or Redirect URI doesn't force re-entering the
 * secret every time. It's required the first time a row is created.
 */
export async function saveShopifyAppConfig(
  organizationId: string,
  input: { clientId: string; clientSecret?: string; redirectUri: string }
) {
  const existing = await prisma.shopifyAppConfig.findUnique({ where: { organizationId } });
  if (!existing && !input.clientSecret) {
    throw new Error("A Client Secret is required to configure Shopify for the first time.");
  }

  await prisma.shopifyAppConfig.upsert({
    where: { organizationId },
    update: {
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      ...(input.clientSecret ? { clientSecretEnc: encryptSecret(input.clientSecret) } : {}),
    },
    create: {
      organizationId,
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      clientSecretEnc: encryptSecret(input.clientSecret!),
    },
  });
}

/** Removes the DB-entered config, reverting this organization to the env-var fallback (if any is set). */
export async function clearShopifyAppConfig(organizationId: string) {
  await prisma.shopifyAppConfig.deleteMany({ where: { organizationId } });
}
