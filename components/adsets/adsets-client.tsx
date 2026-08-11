"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable, rowsToCsv, downloadCsv } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { useCurrency } from "@/components/currency/currency-provider";
import { useLocale } from "@/components/i18n/locale-provider";

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
  const currency = useCurrency();
  const { intlTag: locale, t } = useLocale();
  const money = (v: number) => formatCurrency(v, currency, locale);
  const num = (v: number) => formatNumber(v, locale);

  const columns: ColumnDef<AdSetRow>[] = [
    {
      accessorKey: "name",
      header: t("adSets.name"),
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
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
    {
      accessorKey: "status",
      header: t("common.status"),
      cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status] ?? "neutral"}>{row.original.status}</Badge>,
    },
    { accessorKey: "dailyBudget", header: t("kpi.dailyBudget"), cell: ({ row }) => (row.original.dailyBudget ? money(row.original.dailyBudget) : "—") },
    { accessorKey: "spend", header: t("kpi.spend"), cell: ({ row }) => money(row.original.spend) },
    { accessorKey: "reach", header: t("kpi.reach"), cell: ({ row }) => num(row.original.reach) },
    { accessorKey: "impressions", header: t("kpi.impressions"), cell: ({ row }) => num(row.original.impressions) },
    { accessorKey: "ctr", header: t("kpi.ctr"), cell: ({ row }) => formatPercent(row.original.ctr) },
    { accessorKey: "cpc", header: t("kpi.cpc"), cell: ({ row }) => money(row.original.cpc) },
    { accessorKey: "cpm", header: t("kpi.cpm"), cell: ({ row }) => money(row.original.cpm) },
    { accessorKey: "frequency", header: t("kpi.frequency"), cell: ({ row }) => row.original.frequency.toFixed(2) },
    { accessorKey: "conversionRate", header: t("kpi.conversionRate"), cell: ({ row }) => formatPercent(row.original.conversionRate) },
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
      emptyTitle={t("empty.noData")}
    />
  );
}
