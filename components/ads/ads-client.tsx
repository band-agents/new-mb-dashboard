"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable, rowsToCsv, downloadCsv } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import type { AdRow } from "@/lib/data/ads.service";
import { useCurrency } from "@/components/currency/currency-provider";
import { useLocale } from "@/components/i18n/locale-provider";

const STATUS_VARIANT: Record<string, "positive" | "warning" | "neutral"> = {
  ACTIVE: "positive",
  PAUSED: "warning",
  ARCHIVED: "neutral",
};

export function AdsClient({ clientId, rows }: { clientId: string; rows: AdRow[] }) {
  const currency = useCurrency();
  const { intlTag: locale, t } = useLocale();
  const money = (v: number) => formatCurrency(v, currency, locale);
  const num = (v: number) => formatNumber(v, locale);

  const columns: ColumnDef<AdRow>[] = [
    {
      accessorKey: "name",
      header: t("ads.name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.creative && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.original.creative.thumbnailUrl} alt="" className="h-8 w-8 rounded object-cover" />
          )}
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "campaignName",
      header: t("campaigns.name"),
      cell: ({ row }) => (
        <Link href={`/${clientId}/campaigns/${row.original.campaignId}`} className="hover:text-brand hover:underline">
          {row.original.campaignName}
        </Link>
      ),
    },
    { accessorKey: "adSetName", header: t("adSets.name") },
    {
      accessorKey: "status",
      header: t("common.status"),
      cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status] ?? "neutral"}>{row.original.status}</Badge>,
    },
    { accessorKey: "spend", header: t("kpi.spend"), cell: ({ row }) => money(row.original.spend) },
    { accessorKey: "impressions", header: t("kpi.impressions"), cell: ({ row }) => num(row.original.impressions) },
    { accessorKey: "reach", header: t("kpi.reach"), cell: ({ row }) => num(row.original.reach) },
    { accessorKey: "ctr", header: t("kpi.ctr"), cell: ({ row }) => formatPercent(row.original.ctr) },
    { accessorKey: "cpc", header: t("kpi.cpc"), cell: ({ row }) => money(row.original.cpc) },
    { accessorKey: "cpm", header: t("kpi.cpm"), cell: ({ row }) => money(row.original.cpm) },
    { accessorKey: "engagement", header: t("metrics.engagement.label"), cell: ({ row }) => num(row.original.engagement ?? 0) },
    { accessorKey: "conversions", header: t("kpi.conversions"), cell: ({ row }) => num(row.original.conversions) },
    {
      accessorKey: "costPerConversion",
      header: t("kpi.costPerConversion"),
      cell: ({ row }) => (row.original.conversions > 0 ? money(row.original.costPerConversion) : "—"),
    },
    { accessorKey: "roas", header: t("kpi.roas"), cell: ({ row }) => (row.original.roas > 0 ? `${row.original.roas.toFixed(2)}x` : "—") },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder={t("common.search")}
      getSearchText={(r) => `${r.name} ${r.campaignName} ${r.adSetName}`}
      onExportCsv={(selected) =>
        downloadCsv(
          "ads.csv",
          rowsToCsv(
            selected.map((r) => ({
              Ad: r.name,
              Campaign: r.campaignName,
              AdSet: r.adSetName,
              Spend: r.spend.toFixed(2),
              CTR: r.ctr.toFixed(2),
              ROAS: r.roas.toFixed(2),
            }))
          )
        )
      }
      emptyTitle={t("empty.noData")}
    />
  );
}
