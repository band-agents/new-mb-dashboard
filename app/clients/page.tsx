import Link from "next/link";
import { listClientsInScope, requireSession } from "@/lib/data/scope";
import { InitialsAvatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/empty-error";
import { AddClientDialog } from "./add-client-dialog";

export default async function ClientsPage() {
  const session = await requireSession();
  const clients = await listClientsInScope();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Your clients</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {session.user.email} — pick a client to open their dashboard.
          </p>
        </div>
        <AddClientDialog />
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="Add your first client to start monitoring their Meta performance."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <Link key={c.id} href={`/${c.id}/overview`}>
              <Card className="flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <InitialsAvatar name={c.name} hue={c.avatarHue} size={40} />
                  <div>
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.industry ?? "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.metaConnection?.status === "CONNECTED" ? (
                    <Badge variant="positive">Live</Badge>
                  ) : (
                    <Badge variant="brand">Demo</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {c.adAccounts.length} ad account{c.adAccounts.length === 1 ? "" : "s"}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
