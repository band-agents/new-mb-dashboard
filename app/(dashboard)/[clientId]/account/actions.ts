"use server";

import { revalidatePath } from "next/cache";
import { requireClientInScope } from "@/lib/data/scope";
import { prisma } from "@/lib/prisma";

export async function disconnectMetaAction(clientId: string) {
  const { client } = await requireClientInScope(clientId);
  await prisma.metaConnection.upsert({
    where: { clientId: client.id },
    update: { status: "NOT_CONNECTED", accessTokenEnc: null, tokenExpiresAt: null, lastError: null },
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
