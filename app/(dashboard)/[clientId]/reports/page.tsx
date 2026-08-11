import { requireClientInScope } from "@/lib/data/scope";
import { prisma } from "@/lib/prisma";
import { ReportBuilder } from "@/components/reports/report-builder";

export default async function ReportsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const { client } = await requireClientInScope(clientId);

  const campaigns = await prisma.campaign.findMany({
    where: { adAccount: { clientId } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Reports</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Build a custom performance report and export it as CSV or PDF.
      </p>
      <ReportBuilder clientId={clientId} clientName={client.name} campaigns={campaigns} />
    </div>
  );
}
