import { getInsightRows, groupByDate } from "./insights";
import { deriveMetrics, sumRows } from "./metrics";

export async function getPerformanceSeries(params: { clientId: string; start: Date; end: Date }) {
  const rows = await getInsightRows({
    clientId: params.clientId,
    start: params.start,
    end: params.end,
    level: "CAMPAIGN",
  });
  const byDate = groupByDate(rows);
  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, dayRows]) => ({ date, ...deriveMetrics(sumRows(dayRows)) }));
}
