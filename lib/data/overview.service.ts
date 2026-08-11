import { getInsightRows, groupByDate } from "./insights";
import { aggregate, deriveMetrics, sumRows } from "./metrics";
import { comparisonRange, type ComparePreset } from "./dateRange";
import { prisma } from "@/lib/prisma";

export type OverviewParams = {
  clientId: string;
  start: Date;
  end: Date;
  compare: ComparePreset;
  campaignStatus?: string[];
  objective?: string[];
};

export async function getOverviewData(params: OverviewParams) {
  const connection = await prisma.metaConnection.findUnique({ where: { clientId: params.clientId } });
  const isLive = connection?.status === "CONNECTED";

  const currentRows = await getInsightRows({
    clientId: params.clientId,
    start: params.start,
    end: params.end,
    level: "CAMPAIGN",
    campaignStatus: params.campaignStatus,
    objective: params.objective,
  });

  const current = aggregate(currentRows);

  let previous: ReturnType<typeof aggregate> | null = null;
  const prevRange = comparisonRange({ start: params.start, end: params.end }, params.compare);
  if (prevRange) {
    const prevRows = await getInsightRows({
      clientId: params.clientId,
      start: prevRange.start,
      end: prevRange.end,
      level: "CAMPAIGN",
      campaignStatus: params.campaignStatus,
      objective: params.objective,
    });
    previous = aggregate(prevRows);
  }

  const byDate = groupByDate(currentRows);
  const series = Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, rows]) => ({ date, ...deriveMetrics(sumRows(rows)) }));

  return {
    source: isLive ? ("live" as const) : ("demo" as const),
    current,
    previous,
    series,
    hasData: currentRows.length > 0,
  };
}
