import { requireClientInScope } from "@/lib/data/scope";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { getAdsTable } from "@/lib/data/ads.service";
import { FilterBar } from "@/components/filters/filter-bar";
import { CreativesClient } from "@/components/creatives/creatives-client";
import { getLocale } from "@/lib/i18n/getLocale";
import { t } from "@/lib/i18n/t";

export default async function CreativesPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { clientId } = await params;
  await requireClientInScope(clientId);
  const sp = await searchParams;
  const { start, end } = resolvePreset((sp.range as DateRangePreset) || "last_30_days");

  const rows = await getAdsTable({ clientId, start, end });
  const locale = await getLocale();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">{t(locale, "creatives.title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(locale, "creatives.subtitle")}</p>
      <FilterBar showStatusFilter={false} />
      <CreativesClient rows={rows} />
    </div>
  );
}
