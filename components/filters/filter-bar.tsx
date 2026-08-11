"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RefreshCw, Download } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DATE_PRESET_LABELS, type DateRangePreset, type ComparePreset } from "@/lib/data/dateRange";
import { toast } from "sonner";
import { useState, useTransition } from "react";

const COMPARE_LABELS: Record<ComparePreset, string> = {
  previous_period: "Previous period",
  previous_month: "Previous month",
  previous_year: "Previous year",
  none: "No comparison",
};

export function FilterBar({
  showStatusFilter = true,
  onExport,
}: {
  showStatusFilter?: boolean;
  onExport?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [spinning, setSpinning] = useState(false);

  const range = (searchParams.get("range") as DateRangePreset) || "last_30_days";
  const compare = (searchParams.get("compare") as ComparePreset) || "previous_period";
  const status = searchParams.get("status") || "all";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "") params.delete(key);
    else params.set(key, value);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function refresh() {
    setSpinning(true);
    router.refresh();
    toast.success("Data refreshed");
    setTimeout(() => setSpinning(false), 600);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Select value={range} onValueChange={(v) => updateParam("range", v)}>
        <SelectTrigger className="w-[150px]">
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

      <Select value={compare} onValueChange={(v) => updateParam("compare", v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(COMPARE_LABELS).map(([k, label]) => (
            <SelectItem key={k} value={k}>
              Compare: {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showStatusFilter && (
        <Select value={status} onValueChange={(v) => updateParam("status", v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={refresh} disabled={isPending}>
          <RefreshCw className={`h-3.5 w-3.5 ${spinning ? "animate-spin" : ""}`} /> Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </div>
    </div>
  );
}
