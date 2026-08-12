// Server-only: resolves the TikTok Developer App credentials (Client ID /
// Client Secret / Redirect URI) this organization's OAuth flow should use.
//
// Two sources, checked in order:
//   1. TikTokAppConfig — entered from the dashboard's Connections page,
//      one row per Organization. clientSecretEnc is AES-256-GCM ciphertext
//      (lib/security/crypto.ts), same convention as every access token in
//      this schema. clientId is stored in plaintext because it isn't a
//      secret — TikTok itself puts it in the browser's address bar as part
//      of the authorization redirect.
//   2. env.tiktok (TIKTOK_CLIENT_ID / TIKTOK_CLIENT_SECRET /
//      TIKTOK_REDIRECT_URI) — a deployment-level fallback for ops-managed
//      setups. Never required once a TikTokAppConfig row exists.
//
// Nothing here may be imported from a Client Component. Every exported
// function that could leak the secret returns either the resolved
// credentials (server-only call sites: OAuth start/callback routes) or a
// UI-safe summary that only ever contains a `hasSecret: boolean` flag —
// never the plaintext or ciphertext value itself.

import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";
import { env } from "@/lib/env";

export type TikTokAppCredentials = { clientId: string; clientSecret: string; redirectUri: string };

export type TikTokAppConfigSummary =
  | { source: "DATABASE"; clientId: string; redirectUri: string }
  | { source: "ENV"; clientId: string; redirectUri: string }
  | { source: "NONE" };

/** The real credentials to use for this organization's TikTok OAuth flow, or null if nothing is configured anywhere. */
export async function getTikTokAppCredentials(organizationId: string): Promise<TikTokAppCredentials | null> {
  const row = await prisma.tikTokAppConfig.findUnique({ where: { organizationId } });
  if (row) {
    const clientSecret = decryptSecret(row.clientSecretEnc);
    if (clientSecret) return { clientId: row.clientId, clientSecret, redirectUri: row.redirectUri };
  }
  if (env.tiktok.clientId && env.tiktok.clientSecret) {
    return { clientId: env.tiktok.clientId, clientSecret: env.tiktok.clientSecret, redirectUri: env.tiktok.redirectUri };
  }
  return null;
}

export async function isTikTokConfiguredForOrg(organizationId: string): Promise<boolean> {
  return (await getTikTokAppCredentials(organizationId)) !== null;
}

/** UI-safe summary for rendering the Connections page — never includes the secret in any form. */
export async function getTikTokAppConfigSummary(organizationId: string): Promise<TikTokAppConfigSummary> {
  const row = await prisma.tikTokAppConfig.findUnique({ where: { organizationId } });
  if (row) return { source: "DATABASE", clientId: row.clientId, redirectUri: row.redirectUri };
  if (env.tiktok.clientId && env.tiktok.clientSecret) {
    return { source: "ENV", clientId: env.tiktok.clientId, redirectUri: env.tiktok.redirectUri };
  }
  return { source: "NONE" };
}

/**
 * clientSecret is optional on update: leaving it blank when a row already
 * exists keeps the previously-stored (encrypted) secret unchanged, so
 * editing just the Client ID or Redirect URI doesn't force re-entering the
 * secret every time. It's required the first time a row is created.
 */
export async function saveTikTokAppConfig(
  organizationId: string,
  input: { clientId: string; clientSecret?: string; redirectUri: string }
) {
  const existing = await prisma.tikTokAppConfig.findUnique({ where: { organizationId } });
  if (!existing && !input.clientSecret) {
    throw new Error("A Client Secret is required to configure TikTok for the first time.");
  }

  await prisma.tikTokAppConfig.upsert({
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
export async function clearTikTokAppConfig(organizationId: string) {
  await prisma.tikTokAppConfig.deleteMany({ where: { organizationId } });
}
