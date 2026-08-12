import { requireClientInScope, listClientsInScope } from "@/lib/data/scope";
import { getClientCurrency } from "@/lib/data/currency";
import { getPlatform } from "@/lib/platforms/getPlatform";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SyncBanner } from "@/components/layout/sync-banner";
import { CurrencyProvider } from "@/components/currency/currency-provider";
import { PlatformProvider } from "@/components/platforms/platform-provider";

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
  const platform = await getPlatform();
  const tiktokConnection = await prisma.tikTokConnection.findUnique({ where: { clientId } });

  // "ALL" has no single currency of its own — components under it show each
  // source's own currency explicitly rather than relying on this context.
  const currencyPlatform = platform === "ALL" ? "META" : platform;
  const currency = await getClientCurrency(clientId, currencyPlatform);

  const activeConnectionStatus = platform === "TIKTOK" ? tiktokConnection?.status : client.metaConnection?.status;
  const isLive = activeConnectionStatus === "CONNECTED";

  return (
    <PlatformProvider platform={platform}>
      <CurrencyProvider currency={currency}>
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
            {activeConnectionStatus === "ERROR" && (
              <SyncBanner
                clientId={clientId}
                lastSyncedAt={(platform === "TIKTOK" ? tiktokConnection?.lastSyncedAt : client.metaConnection?.lastSyncedAt)?.toISOString() ?? null}
              />
            )}
            <main className="flex-1 bg-background p-4 md:p-6">{children}</main>
          </div>
        </div>
      </CurrencyProvider>
    </PlatformProvider>
  );
}
