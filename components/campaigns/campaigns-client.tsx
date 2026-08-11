"use client";

import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable, selectionColumn, rowsToCsv, downloadCsv } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import type { CampaignRow } from "@/lib/data/campaigns.service";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "positive" | "warning" | "neutral"> = {
  ACTIVE: "positive",
  PAUSED: "warning",
  ARCHIVED: "neutral",
  COMPLETED: "neutral",
};

export function CampaignsClient({ clientId, rows }: { clientId: string; rows: CampaignRow[] }) {
  const router = useRouter();

  const columns: ColumnDef<CampaignRow>[] = [
    selectionColumn<CampaignRow>(),
    {
      accessorKey: "name",
      header: "Campaign",
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status] ?? "neutral"}>{row.original.status}</Badge>,
    },
    { accessorKey: "objective", header: "Objective" },
    {
      accessorKey: "dailyBudget",
      header: "Budget/day",
      cell: ({ row }) => (row.original.dailyBudget ? formatCurrency(row.original.dailyBudget) : "—"),
    },
    { accessorKey: "spend", header: "Spend", cell: ({ row }) => formatCurrency(row.original.spend) },
    { accessorKey: "impressions", header: "Impressions", cell: ({ row }) => formatNumber(row.original.impressions) },
    { accessorKey: "reach", header: "Reach", cell: ({ row }) => formatNumber(row.original.reach) },
    { accessorKey: "frequency", header: "Frequency", cell: ({ row }) => row.original.frequency.toFixed(2) },
    { accessorKey: "clicks", header: "Clicks", cell: ({ row }) => formatNumber(row.original.clicks) },
    { accessorKey: "ctr", header: "CTR", cell: ({ row }) => formatPercent(row.original.ctr) },
    { accessorKey: "cpc", header: "CPC", cell: ({ row }) => formatCurrency(row.original.cpc) },
    { accessorKey: "cpm", header: "CPM", cell: ({ row }) => formatCurrency(row.original.cpm) },
    { accessorKey: "leads", header: "Leads", cell: ({ row }) => formatNumber(row.original.leads) },
    { accessorKey: "purchases", header: "Purchases", cell: ({ row }) => formatNumber(row.original.purchases) },
    { accessorKey: "conversions", header: "Conversions", cell: ({ row }) => formatNumber(row.original.conversions) },
    {
      accessorKey: "costPerConversion",
      header: "Cost/Result",
      cell: ({ row }) => (row.original.conversions > 0 ? formatCurrency(row.original.costPerConversion) : "—"),
    },
    { accessorKey: "conversionValue", header: "Conv. Value", cell: ({ row }) => formatCurrency(row.original.conversionValue) },
    {
      accessorKey: "roas",
      header: "ROAS",
      cell: ({ row }) => {
        const v = row.original.roas;
        const good = v >= 2;
        const bad = v > 0 && v < 1;
        return (
          <span className={cn("font-medium", good && "text-positive", bad && "text-negative")}>
            {v > 0 ? `${v.toFixed(2)}x` : "—"}
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Search campaigns…"
      getSearchText={(r) => r.name}
      onRowClick={(r) => router.push(`/${clientId}/campaigns/${r.id}`)}
      onExportCsv={(selected) =>
        downloadCsv(
          "campaigns.csv",
          rowsToCsv(
            selected.map((r) => ({
              Campaign: r.name,
              Status: r.status,
              Objective: r.objective,
              Spend: r.spend.toFixed(2),
              Impressions: r.impressions,
              Reach: r.reach,
              Clicks: r.clicks,
              CTR: r.ctr.toFixed(2),
              CPC: r.cpc.toFixed(2),
              CPM: r.cpm.toFixed(2),
              Conversions: r.conversions,
              CostPerConversion: r.costPerConversion.toFixed(2),
              ConversionValue: r.conversionValue.toFixed(2),
              ROAS: r.roas.toFixed(2),
            }))
          )
        )
      }
      emptyTitle="No campaigns match your filters"
      emptyDescription="Try widening the date range or clearing filters."
    />
  );
}
