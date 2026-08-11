import { prisma } from "@/lib/prisma";
import type { AdPlatform } from "@/lib/platforms/types";

/**
 * The ISO currency code to use for every monetary metric shown to this
 * client, for the given advertising platform. Always the real currency the
 * platform reported on the connected account (set by lib/meta/sync.ts /
 * lib/tiktok/sync.ts) — never assumed. Falls back to "USD" only when the
 * client has no account on that platform yet (e.g. not connected/seeded).
 */
export async function getClientCurrency(clientId: string, platform: AdPlatform = "META"): Promise<string> {
  const adAccount = await prisma.adAccount.findFirst({
    where: { clientId, adPlatform: platform },
    select: { currency: true },
  });
  return adAccount?.currency ?? "USD";
}
