"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable, rowsToCsv, downloadCsv } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

type AdSetRow = {
  id: string;
  name: string;
  status: string;
  dailyBudget: number | null;
  campaignId: string;
  campaignName: string;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  conversionRate: number;
  conversions: number;
  costPerConversion: number;
  roas: number;
};

const STATUS_VARIANT: Record<string, "positive" | "warning" | "neutral"> = {
  ACTIVE: "positive",
  PAUSED: "warning",
  ARCHIVED: "neutral",
};

export function AdSetsClient({ clientId, rows }: { clientId: string; rows: AdSetRow[] }) {
  const columns: ColumnDef<AdSetRow>[] = [
    {
      accessorKey: "name",
      header: "Ad Set",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
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
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status] ?? "neutral"}>{row.original.status}</Badge>,
    },
    { accessorKey: "dailyBudget", header: "Budget/day", cell: ({ row }) => (row.original.dailyBudget ? formatCurrency(row.original.dailyBudget) : "—") },
    { accessorKey: "spend", header: "Spend", cell: ({ row }) => formatCurrency(row.original.spend) },
    { accessorKey: "reach", header: "Reach", cell: ({ row }) => formatNumber(row.original.reach) },
    { accessorKey: "impressions", header: "Impressions", cell: ({ row }) => formatNumber(row.original.impressions) },
    { accessorKey: "ctr", header: "CTR", cell: ({ row }) => formatPercent(row.original.ctr) },
    { accessorKey: "cpc", header: "CPC", cell: ({ row }) => formatCurrency(row.original.cpc) },
    { accessorKey: "cpm", header: "CPM", cell: ({ row }) => formatCurrency(row.original.cpm) },
    { accessorKey: "frequency", header: "Frequency", cell: ({ row }) => row.original.frequency.toFixed(2) },
    { accessorKey: "conversionRate", header: "Conv. Rate", cell: ({ row }) => formatPercent(row.original.conversionRate) },
    {
      accessorKey: "costPerConversion",
      header: "Cost/Result",
      cell: ({ row }) => (row.original.conversions > 0 ? formatCurrency(row.original.costPerConversion) : "—"),
    },
    { accessorKey: "roas", header: "ROAS", cell: ({ row }) => (row.original.roas > 0 ? `${row.original.roas.toFixed(2)}x` : "—") },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Search ad sets…"
      getSearchText={(r) => `${r.name} ${r.campaignName}`}
      onExportCsv={(selected) =>
        downloadCsv(
          "adsets.csv",
          rowsToCsv(
            selected.map((r) => ({
              AdSet: r.name,
              Campaign: r.campaignName,
              Status: r.status,
              Spend: r.spend.toFixed(2),
              CTR: r.ctr.toFixed(2),
              CPC: r.cpc.toFixed(2),
              ROAS: r.roas.toFixed(2),
            }))
          )
        )
      }
      emptyTitle="No ad sets found"
    />
  );
}
