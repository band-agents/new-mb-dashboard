"use client";

import { useState } from "react";
import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/input";
import { DATE_PRESET_LABELS, resolvePreset, type DateRangePreset } from "@/lib/data/dateRange";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/utils";
import { rowsToCsv, downloadCsv } from "@/components/tables/data-table";
import { EmptyState } from "@/components/states/empty-error";
import type { CampaignRow } from "@/lib/data/campaigns.service";

const METRIC_OPTIONS = [
  { key: "spend", label: "Spend" },
  { key: "impressions", label: "Impressions" },
  { key: "clicks", label: "Clicks" },
  { key: "ctr", label: "CTR" },
  { key: "cpc", label: "CPC" },
  { key: "conversions", label: "Conversions" },
  { key: "costPerConversion", label: "Cost / Conversion" },
  { key: "conversionValue", label: "Conversion Value" },
  { key: "roas", label: "ROAS" },
] as const;

export function ReportBuilder({
  clientId,
  clientName,
  campaigns,
}: {
  clientId: string;
  clientName: string;
  campaigns: { id: string; name: string }[];
}) {
  const [range, setRange] = useState<DateRangePreset>("last_30_days");
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set(campaigns.map((c) => c.id)));
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(
    new Set(["spend", "impressions", "clicks", "ctr", "conversions", "roas"])
  );
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CampaignRow[] | null>(null);

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

  const metricList = METRIC_OPTIONS.filter((m) => selectedMetrics.has(m.key));

  function formatMetric(key: string, value: number) {
    if (["spend", "cpc", "costPerConversion", "conversionValue"].includes(key)) return formatCurrency(value);
    if (key === "ctr") return formatPercent(value);
    if (key === "roas") return `${value.toFixed(2)}x`;
    return formatNumber(value);
  }

  function exportCsv() {
    if (!rows) return;
    const csvRows = rows.map((r) => {
      const obj: Record<string, string | number> = { Campaign: r.name };
      for (const m of metricList) obj[m.label] = formatMetric(m.key, r[m.key as keyof CampaignRow] as number);
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
    doc.text(`${DATE_PRESET_LABELS[range]} · Generated ${formatDate(new Date())}`, 14, 25);

    autoTable(doc, {
      startY: 32,
      head: [["Campaign", ...metricList.map((m) => m.label)]],
      body: rows.map((r) => [r.name, ...metricList.map((m) => formatMetric(m.key, r[m.key as keyof CampaignRow] as number))]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`${clientName}-report.pdf`);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit p-4">
        <h3 className="mb-3 text-sm font-semibold">Report settings</h3>

        <div className="mb-4 space-y-1.5">
          <Label>Date range</Label>
          <Select value={range} onValueChange={(v) => setRange(v as DateRangePreset)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DATE_PRESET_LABELS)
                .filter(([k]) => k !== "custom")
                .map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4">
          <Label>Campaigns</Label>
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
          <Label>Metrics</Label>
          <div className="mt-1.5 space-y-1.5">
            {METRIC_OPTIONS.map((m) => (
              <label key={m.key} className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={selectedMetrics.has(m.key)}
                  onCheckedChange={() => toggleSet(selectedMetrics, setSelectedMetrics, m.key)}
                />
                {m.label}
              </label>
            ))}
          </div>
        </div>

        <Button className="w-full" onClick={generate} disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Generate report
        </Button>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Preview</h3>
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
          <EmptyState title="No report generated yet" description="Choose your settings and click Generate report." />
        ) : rows.length === 0 ? (
          <EmptyState title="No data for this selection" description="Try selecting different campaigns or a wider date range." />
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Campaign</th>
                  {metricList.map((m) => (
                    <th key={m.key} className="pb-2 pr-4 font-medium">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2 pr-4">{r.name}</td>
                    {metricList.map((m) => (
                      <td key={m.key} className="py-2 pr-4">
                        {formatMetric(m.key, r[m.key as keyof CampaignRow] as number)}
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
