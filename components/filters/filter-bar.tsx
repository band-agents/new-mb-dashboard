"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RefreshCw, Download } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { type DateRangePreset, type ComparePreset } from "@/lib/data/dateRange";
import { toast } from "sonner";
import { useState, useTransition } from "react";
import { useLocale } from "@/components/i18n/locale-provider";

const DATE_PRESET_KEYS: DateRangePreset[] = [
  "today",
  "yesterday",
  "last_7_days",
  "last_14_days",
  "last_30_days",
  "last_90_days",
  "this_month",
];
const COMPARE_KEYS: ComparePreset[] = ["previous_period", "previous_month", "previous_year", "none"];

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
  const { t } = useLocale();

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
    toast.success(t("filterBar.dataRefreshed"));
    setTimeout(() => setSpinning(false), 600);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Select value={range} onValueChange={(v) => updateParam("range", v)}>
        <SelectTrigger className="w-[150px]">
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

      <Select value={compare} onValueChange={(v) => updateParam("compare", v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COMPARE_KEYS.map((k) => (
            <SelectItem key={k} value={k}>
              {t("filterBar.comparePrefix")}: {t(`comparePreset.${k}`)}
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
            <SelectItem value="all">{t("filterBar.allStatuses")}</SelectItem>
            <SelectItem value="ACTIVE">{t("common.active")}</SelectItem>
            <SelectItem value="PAUSED">{t("common.paused")}</SelectItem>
            <SelectItem value="ARCHIVED">{t("common.archived")}</SelectItem>
          </SelectContent>
        </Select>
      )}

      <div className="ms-auto flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={refresh} disabled={isPending}>
          <RefreshCw className={`h-3.5 w-3.5 ${spinning ? "animate-spin" : ""}`} /> {t("common.refresh")}
        </Button>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-3.5 w-3.5" /> {t("common.export")}
        </Button>
      </div>
    </div>
  );
}
