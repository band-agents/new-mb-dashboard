"use server";

import { revalidatePath } from "next/cache";
import { requireClientInScope } from "@/lib/data/scope";
import { prisma } from "@/lib/prisma";
import { MetaApiError } from "@/lib/meta/client";
import { syncClientFromMeta } from "@/lib/meta/sync";
import { ShopifyApiError } from "@/lib/shopify/client";
import { syncClientFromShopify } from "@/lib/shopify/sync";
import { decryptSecret } from "@/lib/security/crypto";

export type ConnectMetaResult = { ok: true; adAccountName: string; campaignCount: number } | { ok: false; error: string };

/** Paste-a-token connect flow: validates the token, pulls real data in immediately, no Meta App required. */
export async function connectMetaWithTokenAction(clientId: string, accessToken: string): Promise<ConnectMetaResult> {
  const { client } = await requireClientInScope(clientId);
  const token = accessToken.trim();
  if (!token) return { ok: false, error: "Paste a Meta access token first." };

  try {
    const result = await syncClientFromMeta(client.id, token);
    revalidatePath(`/${clientId}`, "layout");
    return { ok: true, adAccountName: result.adAccountName, campaignCount: result.campaignCount };
  } catch (err) {
    const message =
      err instanceof MetaApiError
        ? err.isTokenExpired
          ? "That token is invalid or expired. Generate a new one and try again."
          : err.message
        : err instanceof Error
          ? err.message
          : "Something went wrong talking to Meta.";
    await prisma.metaConnection.upsert({
      where: { clientId: client.id },
      update: { status: "ERROR", lastError: message },
      create: { clientId: client.id, status: "ERROR", lastError: message },
    });
    revalidatePath(`/${clientId}/account`);
    return { ok: false, error: message };
  }
}

/** Re-syncs using the already-stored (encrypted) token — for the "Refresh now" button. */
export async function resyncMetaAction(clientId: string): Promise<ConnectMetaResult> {
  const { client } = await requireClientInScope(clientId);
  const connection = await prisma.metaConnection.findUnique({ where: { clientId: client.id } });
  const token = decryptSecret(connection?.accessTokenEnc);
  if (!token) return { ok: false, error: "No stored token to refresh with. Reconnect with a fresh token." };
  return connectMetaWithTokenAction(clientId, token);
}

export async function disconnectMetaAction(clientId: string) {
  const { client } = await requireClientInScope(clientId);
  await prisma.metaConnection.upsert({
    where: { clientId: client.id },
    update: { status: "NOT_CONNECTED", accessTokenEnc: null, tokenExpiresAt: null, lastError: null },
    create: { clientId: client.id, status: "NOT_CONNECTED" },
  });
  revalidatePath(`/${clientId}/account`);
}

export type ConnectShopifyResult = { ok: true; storeName: string; orderCount: number } | { ok: false; error: string };

/** Paste-a-token connect flow for Shopify: a custom-app Admin API token + shop domain, same pattern as Meta. */
export async function connectShopifyWithTokenAction(clientId: string, shopDomain: string, accessToken: string): Promise<ConnectShopifyResult> {
  const { client } = await requireClientInScope(clientId);
  const domain = shopDomain.trim();
  const token = accessToken.trim();
  if (!domain || !token) return { ok: false, error: "Enter your shop domain and paste an Admin API access token." };

  try {
    const result = await syncClientFromShopify(client.id, domain, token);
    revalidatePath(`/${clientId}`, "layout");
    return { ok: true, storeName: result.storeName, orderCount: result.orderCount };
  } catch (err) {
    const message =
      err instanceof ShopifyApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Something went wrong talking to Shopify.";
    await prisma.shopifyConnection.upsert({
      where: { clientId: client.id },
      update: { status: "ERROR", lastError: message },
      create: { clientId: client.id, status: "ERROR", lastError: message },
    });
    revalidatePath(`/${clientId}/account`);
    return { ok: false, error: message };
  }
}

/** Re-syncs using the already-stored (encrypted) token — for the "Refresh now" button. */
export async function resyncShopifyAction(clientId: string): Promise<ConnectShopifyResult> {
  const { client } = await requireClientInScope(clientId);
  const connection = await prisma.shopifyConnection.findUnique({ where: { clientId: client.id } });
  const token = decryptSecret(connection?.accessTokenEnc);
  if (!token || !connection?.shopDomain) return { ok: false, error: "No stored connection to refresh. Reconnect with a fresh token." };
  return connectShopifyWithTokenAction(clientId, connection.shopDomain, token);
}

export async function disconnectShopifyAction(clientId: string) {
  const { client } = await requireClientInScope(clientId);
  await prisma.shopifyConnection.upsert({
    where: { clientId: client.id },
    update: { status: "NOT_CONNECTED", accessTokenEnc: null, lastError: null },
    create: { clientId: client.id, status: "NOT_CONNECTED" },
  });
  revalidatePath(`/${clientId}/account`);
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const { client } = await requireClientInScope(clientId);
  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  if (!name) return;
  await prisma.client.update({
    where: { id: client.id },
    data: { name, industry: industry || null },
  });
  revalidatePath(`/${clientId}/account`);
}
