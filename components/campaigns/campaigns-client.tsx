"use client";

import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable, selectionColumn, rowsToCsv, downloadCsv } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import type { CampaignRow } from "@/lib/data/campaigns.service";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/currency/currency-provider";
import { useLocale } from "@/components/i18n/locale-provider";

const STATUS_VARIANT: Record<string, "positive" | "warning" | "neutral"> = {
  ACTIVE: "positive",
  PAUSED: "warning",
  ARCHIVED: "neutral",
  COMPLETED: "neutral",
};

export function CampaignsClient({ clientId, rows }: { clientId: string; rows: CampaignRow[] }) {
  const router = useRouter();
  const currency = useCurrency();
  const { intlTag: locale, t } = useLocale();
  const money = (v: number) => formatCurrency(v, currency, locale);
  const num = (v: number) => formatNumber(v, locale);

  const columns: ColumnDef<CampaignRow>[] = [
    selectionColumn<CampaignRow>(),
    {
      accessorKey: "name",
      header: t("campaigns.name"),
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: "status",
      header: t("common.status"),
      cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status] ?? "neutral"}>{row.original.status}</Badge>,
    },
    { accessorKey: "objective", header: t("campaigns.objective") },
    {
      accessorKey: "dailyBudget",
      header: t("kpi.dailyBudget"),
      cell: ({ row }) => (row.original.dailyBudget ? money(row.original.dailyBudget) : "—"),
    },
    { accessorKey: "spend", header: t("kpi.spend"), cell: ({ row }) => money(row.original.spend) },
    { accessorKey: "impressions", header: t("kpi.impressions"), cell: ({ row }) => num(row.original.impressions) },
    { accessorKey: "reach", header: t("kpi.reach"), cell: ({ row }) => num(row.original.reach) },
    { accessorKey: "frequency", header: t("kpi.frequency"), cell: ({ row }) => row.original.frequency.toFixed(2) },
    { accessorKey: "clicks", header: t("kpi.clicks"), cell: ({ row }) => num(row.original.clicks) },
    { accessorKey: "ctr", header: t("kpi.ctr"), cell: ({ row }) => formatPercent(row.original.ctr) },
    { accessorKey: "cpc", header: t("kpi.cpc"), cell: ({ row }) => money(row.original.cpc) },
    { accessorKey: "cpm", header: t("kpi.cpm"), cell: ({ row }) => money(row.original.cpm) },
    { accessorKey: "leads", header: t("kpi.leads"), cell: ({ row }) => num(row.original.leads) },
    { accessorKey: "purchases", header: t("kpi.purchases"), cell: ({ row }) => num(row.original.purchases) },
    { accessorKey: "conversions", header: t("kpi.conversions"), cell: ({ row }) => num(row.original.conversions) },
    {
      accessorKey: "costPerConversion",
      header: t("kpi.costPerConversion"),
      cell: ({ row }) => (row.original.conversions > 0 ? money(row.original.costPerConversion) : "—"),
    },
    { accessorKey: "conversionValue", header: t("kpi.conversionValue"), cell: ({ row }) => money(row.original.conversionValue) },
    {
      accessorKey: "roas",
      header: t("kpi.roas"),
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
      emptyTitle={t("campaigns.noCampaigns")}
      emptyDescription={t("empty.tryDifferentRange")}
    />
  );
}
