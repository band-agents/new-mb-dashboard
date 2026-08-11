import { requireClientInScope } from "@/lib/data/scope";
import { prisma } from "@/lib/prisma";
import { ReportBuilder } from "@/components/reports/report-builder";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";

export default async function ReportsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const { client } = await requireClientInScope(clientId);

  const campaigns = await prisma.campaign.findMany({
    where: { adAccount: { clientId } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const locale = await getLocale();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">{t(locale, "reports.title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "reports.subtitle")}</p>
      <ReportBuilder clientId={clientId} clientName={client.name} campaigns={campaigns} />
    </div>
  );
}
