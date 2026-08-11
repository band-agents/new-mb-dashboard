import Link from "next/link";
import { listClientsInScope, requireSession } from "@/lib/data/scope";
import { InitialsAvatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/empty-error";
import { AddClientDialog } from "./add-client-dialog";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";

export default async function ClientsPage() {
  const session = await requireSession();
  const clients = await listClientsInScope();
  const locale = await getLocale();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t(locale, "clients.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(locale, "clients.subtitle", { email: session.user.email ?? "" })}
          </p>
        </div>
        <AddClientDialog />
      </div>

      {clients.length === 0 ? (
        <EmptyState title={t(locale, "clients.noClientsYet")} description={t(locale, "clients.noClientsDesc")} />
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
                    <Badge variant="positive">{t(locale, "common.live")}</Badge>
                  ) : (
                    <Badge variant="brand">{t(locale, "common.demo")}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {c.adAccounts.length} {t(locale, c.adAccounts.length === 1 ? "clients.adAccount" : "clients.adAccounts")}
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
