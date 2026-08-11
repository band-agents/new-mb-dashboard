import { requireClientInScope } from "@/lib/data/scope";
import { prisma } from "@/lib/prisma";
import { isMetaConfigured } from "@/lib/env";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConnectionCard } from "./connection-card";
import { updateClientAction } from "./actions";

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const { clientId } = await params;
  const { client, session } = await requireClientInScope(clientId);
  const sp = await searchParams;

  const adAccounts = await prisma.adAccount.findMany({ where: { clientId } });

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold">Account</h1>
      <p className="mb-4 text-sm text-muted-foreground">Connection, ad accounts, and dashboard settings for {client.name}.</p>

      <div className="space-y-4">
        <ConnectionCard
          clientId={clientId}
          status={client.metaConnection?.status ?? "NOT_CONNECTED"}
          isMetaConfigured={isMetaConfigured()}
          lastSyncedAt={client.metaConnection?.lastSyncedAt?.toISOString() ?? null}
          lastError={client.metaConnection?.lastError ?? null}
          error={sp.error}
        />

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Ad accounts</h2>
          {adAccounts.length === 0 ? (
            <p className="text-xs text-muted-foreground">No ad accounts yet.</p>
          ) : (
            <ul className="space-y-2">
              {adAccounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.metaAccountId} · {a.currency}</p>
                  </div>
                  <Badge variant={a.status === "ACTIVE" ? "positive" : "neutral"}>{a.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Client settings</h2>
          <form action={updateClientAction.bind(null, clientId)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Business name</Label>
              <Input id="name" name="name" defaultValue={client.name} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" name="industry" defaultValue={client.industry ?? ""} />
            </div>
            <Button type="submit" size="sm">
              Save changes
            </Button>
          </form>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Signed in as</h2>
          <p className="text-sm">{session.user.name}</p>
          <p className="text-xs text-muted-foreground">{session.user.email} · {session.user.role}</p>
        </Card>
      </div>
    </div>
  );
}
