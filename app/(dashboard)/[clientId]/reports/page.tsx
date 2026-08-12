import { requireClientInScope } from "@/lib/data/scope";
import { prisma } from "@/lib/prisma";
import { ReportBuilder } from "@/components/reports/report-builder";
import { PlatformRequiredNotice } from "@/components/platforms/platform-required-notice";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";
import { getPlatform } from "@/lib/platforms/getPlatform";

export default async function ReportsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const { client } = await requireClientInScope(clientId);
  const locale = await getLocale();
  const platform = await getPlatform();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">{t(locale, "reports.title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "reports.subtitle")}</p>
      {platform === "ALL" ? (
        <PlatformRequiredNotice />
      ) : (
        <ReportsData clientId={clientId} clientName={client.name} platform={platform} />
      )}
    </div>
  );
}

async function ReportsData({ clientId, clientName, platform }: { clientId: string; clientName: string; platform: "META" | "TIKTOK" }) {
  const campaigns = await prisma.campaign.findMany({
    where: { adAccount: { clientId, adPlatform: platform } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return <ReportBuilder clientId={clientId} clientName={clientName} campaigns={campaigns} platform={platform} />;
}
