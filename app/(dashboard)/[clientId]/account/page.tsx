import Link from "next/link";
import { ChevronRight, Plug } from "lucide-react";
import { requireClientInScope } from "@/lib/data/scope";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateClientAction } from "./actions";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";

export default async function AccountPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const { client, session } = await requireClientInScope(clientId);
  const locale = await getLocale();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold">{t(locale, "account.title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "account.subtitle", { client: client.name })}</p>

      <div className="space-y-4">
        <Card className="p-4">
          <Link href={`/${clientId}/connections`} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Plug className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t(locale, "account.manageConnections")}</p>
                <p className="text-xs text-muted-foreground">{t(locale, "account.manageConnectionsDesc")}</p>
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand">
              {t(locale, "nav.connections")}
              <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </span>
          </Link>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">{t(locale, "account.clientSettings")}</h2>
          <form action={updateClientAction.bind(null, clientId)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t(locale, "account.businessName")}</Label>
              <Input id="name" name="name" defaultValue={client.name} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="industry">{t(locale, "account.industry")}</Label>
              <Input id="industry" name="industry" defaultValue={client.industry ?? ""} />
            </div>
            <Button type="submit" size="sm">
              {t(locale, "common.saveChanges")}
            </Button>
          </form>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">{t(locale, "account.signedInAs")}</h2>
          <p className="text-sm">{session.user.name}</p>
          <p className="text-xs text-muted-foreground">{session.user.email} · {session.user.role}</p>
        </Card>
      </div>
    </div>
  );
}
