"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/scope";
import { prisma } from "@/lib/prisma";

export async function createClientAction(formData: FormData) {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  if (!name) return;

  const hue = Math.floor(Math.random() * 360);
  const client = await prisma.client.create({
    data: { organizationId: session.user.organizationId, name, industry: industry || null, avatarHue: hue },
  });
  await prisma.metaConnection.create({ data: { clientId: client.id, status: "NOT_CONNECTED" } });
  await prisma.adAccount.create({
    data: {
      clientId: client.id,
      adPlatform: "META",
      externalAccountId: `demo_act_${client.id.slice(-8)}`,
      name: `${name} — Primary Ad Account`,
    },
  });

  revalidatePath("/clients");
}
