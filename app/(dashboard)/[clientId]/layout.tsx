import { requireClientInScope, listClientsInScope } from "@/lib/data/scope";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { session, client } = await requireClientInScope(clientId);
  const clients = await listClientsInScope();

  const isLive = client.metaConnection?.status === "CONNECTED";

  return (
    <div className="flex min-h-screen">
      <Sidebar clientId={clientId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          activeClient={{ id: client.id, name: client.name, avatarHue: client.avatarHue, isLive }}
          clients={clients.map((c) => ({
            id: c.id,
            name: c.name,
            avatarHue: c.avatarHue,
            isLive: c.metaConnection?.status === "CONNECTED",
          }))}
          userName={session.user.name ?? session.user.email ?? "User"}
          isLive={isLive}
        />
        <main className="flex-1 bg-background p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
