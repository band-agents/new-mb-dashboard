"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import type { AdRow } from "@/lib/data/ads.service";
import { EmptyState } from "@/components/states/empty-error";
import { useCurrency } from "@/components/currency/currency-provider";
import { useLocale } from "@/components/i18n/locale-provider";

function CreativeGrid({ rows, selected, onToggle }: { rows: AdRow[]; selected: Set<string>; onToggle: (id: string) => void }) {
  const currency = useCurrency();
  const { intlTag: locale, t } = useLocale();
  if (rows.length === 0) return <EmptyState title={t("empty.noData")} />;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((ad) => (
        <Card key={ad.id} className="overflow-hidden">
          <div className="relative">
            {ad.creative && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.creative.thumbnailUrl} alt={ad.name} className="h-32 w-full object-cover" />
            )}
            <label className="absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-surface/90">
              <Checkbox checked={selected.has(ad.id)} onCheckedChange={() => onToggle(ad.id)} />
            </label>
            {ad.creative && (
              <Badge variant="outline" className="absolute start-2 top-2 bg-surface/90">
                {ad.creative.format}
              </Badge>
            )}
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-medium">{ad.name}</p>
            <p className="truncate text-xs text-muted-foreground">{ad.campaignName}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
              <span className="text-muted-foreground">{t("kpi.spend")}</span>
              <span className="text-right font-medium">{formatCurrency(ad.spend, currency, locale)}</span>
              <span className="text-muted-foreground">{t("kpi.ctr")}</span>
              <span className="text-right font-medium">{formatPercent(ad.ctr)}</span>
              <span className="text-muted-foreground">{t("kpi.cpc")}</span>
              <span className="text-right font-medium">{formatCurrency(ad.cpc, currency, locale)}</span>
              <span className="text-muted-foreground">{t("kpi.roas")}</span>
              <span className={cn("text-right font-medium", ad.roas >= 2 && "text-positive")}>
                {ad.roas > 0 ? `${ad.roas.toFixed(2)}x` : "—"}
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Leaderboard({ title, rows, kind }: { title: string; rows: AdRow[]; kind: "roas" | "ctr" | "cpc" }) {
  const currency = useCurrency();
  const { intlTag: locale, t } = useLocale();
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <ul className="space-y-2">
        {rows.slice(0, 5).map((ad, i) => (
          <li key={ad.id} className="flex items-center gap-2 text-xs">
            <span className="w-4 text-muted-foreground">{i + 1}</span>
            {ad.creative && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.creative.thumbnailUrl} alt="" className="h-6 w-6 rounded object-cover" />
            )}
            <span className="flex-1 truncate">{ad.name}</span>
            <span className="font-medium">
              {kind === "ctr" ? formatPercent(ad.ctr) : kind === "cpc" ? formatCurrency(ad.cpc, currency, locale) : `${ad.roas.toFixed(2)}x`}
            </span>
          </li>
        ))}
        {rows.length === 0 && <p className="text-xs text-muted-foreground">{t("empty.noData")}</p>}
      </ul>
    </Card>
  );
}

export function CreativesClient({ rows }: { rows: AdRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const currency = useCurrency();
  const { intlTag: locale, t } = useLocale();
  const withSpend = rows.filter((r) => r.spend > 0);

  const topByRoas = useMemo(() => [...withSpend].sort((a, b) => b.roas - a.roas), [withSpend]);
  const lowestByRoas = useMemo(() => [...withSpend].sort((a, b) => a.roas - b.roas), [withSpend]);
  const highestCtr = useMemo(() => [...withSpend].sort((a, b) => b.ctr - a.ctr), [withSpend]);
  const lowestCpc = useMemo(() => [...withSpend].filter((r) => r.cpc > 0).sort((a, b) => a.cpc - b.cpc), [withSpend]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  }

  const compareRows = rows.filter((r) => selected.has(r.id));

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Leaderboard title={t("creatives.topPerforming")} rows={topByRoas} kind="roas" />
        <Leaderboard title={t("creatives.lowestPerforming")} rows={lowestByRoas} kind="roas" />
        <Leaderboard title={t("creatives.highestCtr")} rows={highestCtr} kind="ctr" />
        <Leaderboard title={t("creatives.lowestCpc")} rows={lowestCpc} kind="cpc" />
      </div>

      {compareRows.length > 0 && (
        <Card className="mb-4 overflow-x-auto p-4">
          <h3 className="mb-3 text-sm font-semibold">{compareRows.length} — {t("creatives.allCreatives")}</h3>
          <table className="w-full min-w-[500px] text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-2 font-medium">{t("creatives.title")}</th>
                <th className="pb-2 font-medium">{t("kpi.spend")}</th>
                <th className="pb-2 font-medium">{t("kpi.ctr")}</th>
                <th className="pb-2 font-medium">{t("kpi.cpc")}</th>
                <th className="pb-2 font-medium">{t("kpi.cpm")}</th>
                <th className="pb-2 font-medium">{t("kpi.conversions")}</th>
                <th className="pb-2 font-medium">{t("kpi.roas")}</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((ad) => (
                <tr key={ad.id} className="border-t border-border">
                  <td className="py-2">{ad.name}</td>
                  <td className="py-2">{formatCurrency(ad.spend, currency, locale)}</td>
                  <td className="py-2">{formatPercent(ad.ctr)}</td>
                  <td className="py-2">{formatCurrency(ad.cpc, currency, locale)}</td>
                  <td className="py-2">{formatCurrency(ad.cpm, currency, locale)}</td>
                  <td className="py-2">{ad.conversions}</td>
                  <td className="py-2">{ad.roas > 0 ? `${ad.roas.toFixed(2)}x` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">{t("creatives.allCreatives")}</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <CreativeGrid rows={rows} selected={selected} onToggle={toggle} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
