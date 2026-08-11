"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable, rowsToCsv, downloadCsv } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import type { AdRow } from "@/lib/data/ads.service";

const STATUS_VARIANT: Record<string, "positive" | "warning" | "neutral"> = {
  ACTIVE: "positive",
  PAUSED: "warning",
  ARCHIVED: "neutral",
};

export function AdsClient({ clientId, rows }: { clientId: string; rows: AdRow[] }) {
  const columns: ColumnDef<AdRow>[] = [
    {
      accessorKey: "name",
      header: "Ad",
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
      header: "Campaign",
      cell: ({ row }) => (
        <Link href={`/${clientId}/campaigns/${row.original.campaignId}`} className="hover:text-brand hover:underline">
          {row.original.campaignName}
        </Link>
      ),
    },
    { accessorKey: "adSetName", header: "Ad Set" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status] ?? "neutral"}>{row.original.status}</Badge>,
    },
    { accessorKey: "spend", header: "Spend", cell: ({ row }) => formatCurrency(row.original.spend) },
    { accessorKey: "impressions", header: "Impressions", cell: ({ row }) => formatNumber(row.original.impressions) },
    { accessorKey: "reach", header: "Reach", cell: ({ row }) => formatNumber(row.original.reach) },
    { accessorKey: "ctr", header: "CTR", cell: ({ row }) => formatPercent(row.original.ctr) },
    { accessorKey: "cpc", header: "CPC", cell: ({ row }) => formatCurrency(row.original.cpc) },
    { accessorKey: "cpm", header: "CPM", cell: ({ row }) => formatCurrency(row.original.cpm) },
    { accessorKey: "engagement", header: "Engagement", cell: ({ row }) => formatNumber(row.original.engagement ?? 0) },
    { accessorKey: "conversions", header: "Conversions", cell: ({ row }) => formatNumber(row.original.conversions) },
    {
      accessorKey: "costPerConversion",
      header: "Cost/Conv.",
      cell: ({ row }) => (row.original.conversions > 0 ? formatCurrency(row.original.costPerConversion) : "—"),
    },
    { accessorKey: "roas", header: "ROAS", cell: ({ row }) => (row.original.roas > 0 ? `${row.original.roas.toFixed(2)}x` : "—") },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Search ads…"
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
      emptyTitle="No ads found"
    />
  );
}
