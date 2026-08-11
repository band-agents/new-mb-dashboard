import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Every server-side data access in this app goes through here first.
 * It resolves the signed-in user's organization and asserts that any
 * requested Client belongs to that organization — the single choke point
 * that prevents one agency's data from leaking into another's session.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    redirect("/login");
  }
  return session as typeof session & {
    user: { organizationId: string; id: string; role: string };
  };
}

export async function requireClientInScope(clientId: string) {
  const session = await requireSession();
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: session.user.organizationId },
    include: { metaConnection: true },
  });
  if (!client) {
    redirect("/clients");
  }
  return { session, client: client! };
}

/** List every client belonging to the signed-in user's organization. */
export async function listClientsInScope() {
  const session = await requireSession();
  return prisma.client.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { name: "asc" },
    include: { metaConnection: true, adAccounts: true },
  });
}
