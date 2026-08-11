import { prisma } from "@/lib/prisma";

/**
 * The ISO currency code to use for every monetary metric shown to this client.
 * Always the real currency configured on the connected Meta ad account
 * (set by lib/meta/sync.ts from Meta's own `account.currency` field) — never
 * assumed. Falls back to "USD" only when the client has no ad account yet
 * (e.g. freshly created, not yet connected/seeded).
 */
export async function getClientCurrency(clientId: string): Promise<string> {
  const adAccount = await prisma.adAccount.findFirst({
    where: { clientId },
    select: { currency: true },
  });
  return adAccount?.currency ?? "USD";
}
