"use client";

import { useState } from "react";
import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/input";
import { resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/utils";
import { rowsToCsv, downloadCsv } from "@/components/tables/data-table";
import { EmptyState } from "@/components/states/empty-error";
import type { CampaignRow } from "@/lib/data/campaigns.service";
import { useCurrency } from "@/components/currency/currency-provider";
import { useLocale } from "@/components/i18n/locale-provider";

const METRIC_OPTIONS = [
  "spend",
  "impressions",
  "clicks",
  "ctr",
  "cpc",
  "conversions",
  "costPerConversion",
  "conversionValue",
  "roas",
] as const;
const DATE_PRESET_KEYS: DateRangePreset[] = [
  "today",
  "yesterday",
  "last_7_days",
  "last_14_days",
  "last_30_days",
  "last_90_days",
  "this_month",
];

export function ReportBuilder({
  clientId,
  clientName,
  campaigns,
  platform,
}: {
  clientId: string;
  clientName: string;
  campaigns: { id: string; name: string }[];
  platform: "META" | "TIKTOK";
}) {
  const [range, setRange] = useState<DateRangePreset>("last_30_days");
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set(campaigns.map((c) => c.id)));
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(
    new Set(["spend", "impressions", "clicks", "ctr", "conversions", "roas"])
  );
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CampaignRow[] | null>(null);
  const currency = useCurrency();
  const { intlTag: locale, t } = useLocale();

  async function generate() {
    setLoading(true);
    const { start, end } = resolvePreset(range);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          start: start.toISOString(),
          end: end.toISOString(),
          campaignIds: Array.from(selectedCampaigns),
          platform,
        }),
      });
      const data = await res.json();
      setRows(data.rows ?? []);
    } finally {
      setLoading(false);
    }
  }

  function toggleSet(set: Set<string>, setFn: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFn(next);
  }

  const metricList = METRIC_OPTIONS.filter((m) => selectedMetrics.has(m));
  const metricLabel = (m: string) => t(`metrics.${m}.label`);

  function formatMetric(key: string, value: number) {
    if (["spend", "cpc", "costPerConversion", "conversionValue"].includes(key)) return formatCurrency(value, currency, locale);
    if (key === "ctr") return formatPercent(value);
    if (key === "roas") return `${value.toFixed(2)}x`;
    return formatNumber(value, locale);
  }

  function exportCsv() {
    if (!rows) return;
    const csvRows = rows.map((r) => {
      const obj: Record<string, string | number> = { Campaign: r.name };
      for (const m of metricList) obj[metricLabel(m)] = formatMetric(m, r[m as keyof CampaignRow] as number);
      return obj;
    });
    downloadCsv(`${clientName}-report.csv`, rowsToCsv(csvRows));
  }

  async function exportPdf() {
    if (!rows) return;
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${clientName} — Performance Report`, 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`${t(`dateRange.${range}`)} · Generated ${formatDate(new Date(), locale)}`, 14, 25);

    autoTable(doc, {
      startY: 32,
      head: [["Campaign", ...metricList.map(metricLabel)]],
      body: rows.map((r) => [r.name, ...metricList.map((m) => formatMetric(m, r[m as keyof CampaignRow] as number))]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`${clientName}-report.pdf`);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit p-4">
        <h3 className="mb-3 text-sm font-semibold">{t("reports.settings")}</h3>

        <div className="mb-4 space-y-1.5">
          <Label>{t("reports.dateRange")}</Label>
          <Select value={range} onValueChange={(v) => setRange(v as DateRangePreset)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESET_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {t(`dateRange.${k}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4">
          <Label>{t("reports.campaigns")}</Label>
          <div className="scroll-thin mt-1.5 max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
            {campaigns.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={selectedCampaigns.has(c.id)}
                  onCheckedChange={() => toggleSet(selectedCampaigns, setSelectedCampaigns, c.id)}
                />
                <span className="truncate">{c.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <Label>{t("reports.metrics")}</Label>
          <div className="mt-1.5 space-y-1.5">
            {METRIC_OPTIONS.map((m) => (
              <label key={m} className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={selectedMetrics.has(m)}
                  onCheckedChange={() => toggleSet(selectedMetrics, setSelectedMetrics, m)}
                />
                {metricLabel(m)}
              </label>
            ))}
          </div>
        </div>

        <Button className="w-full" onClick={generate} disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t("reports.generate")}
        </Button>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("reports.preview")}</h3>
          {rows && rows.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportPdf}>
                <FileDown className="h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          )}
        </div>

        {!rows ? (
          <EmptyState title={t("reports.noReportYet")} description={t("reports.chooseSettings")} />
        ) : rows.length === 0 ? (
          <EmptyState title={t("empty.noData")} description={t("empty.tryDifferentRange")} />
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 pe-4 font-medium">{t("campaigns.name")}</th>
                  {metricList.map((m) => (
                    <th key={m} className="pb-2 pe-4 font-medium">
                      {metricLabel(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2 pe-4">{r.name}</td>
                    {metricList.map((m) => (
                      <td key={m} className="py-2 pe-4">
                        {formatMetric(m, r[m as keyof CampaignRow] as number)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
