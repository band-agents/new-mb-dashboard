"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import type { AdRow } from "@/lib/data/ads.service";
import { EmptyState } from "@/components/states/empty-error";

function CreativeGrid({ rows, selected, onToggle }: { rows: AdRow[]; selected: Set<string>; onToggle: (id: string) => void }) {
  if (rows.length === 0) return <EmptyState title="No creatives found" />;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((ad) => (
        <Card key={ad.id} className="overflow-hidden">
          <div className="relative">
            {ad.creative && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.creative.thumbnailUrl} alt={ad.name} className="h-32 w-full object-cover" />
            )}
            <label className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-surface/90">
              <Checkbox checked={selected.has(ad.id)} onCheckedChange={() => onToggle(ad.id)} />
            </label>
            {ad.creative && (
              <Badge variant="outline" className="absolute left-2 top-2 bg-surface/90">
                {ad.creative.format}
              </Badge>
            )}
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-medium">{ad.name}</p>
            <p className="truncate text-xs text-muted-foreground">{ad.campaignName}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
              <span className="text-muted-foreground">Spend</span>
              <span className="text-right font-medium">{formatCurrency(ad.spend)}</span>
              <span className="text-muted-foreground">CTR</span>
              <span className="text-right font-medium">{formatPercent(ad.ctr)}</span>
              <span className="text-muted-foreground">CPC</span>
              <span className="text-right font-medium">{formatCurrency(ad.cpc)}</span>
              <span className="text-muted-foreground">ROAS</span>
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

function Leaderboard({ title, rows }: { title: string; rows: AdRow[] }) {
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
              {title.includes("CTR") ? formatPercent(ad.ctr) : title.includes("CPC") ? formatCurrency(ad.cpc) : `${ad.roas.toFixed(2)}x`}
            </span>
          </li>
        ))}
        {rows.length === 0 && <p className="text-xs text-muted-foreground">No data.</p>}
      </ul>
    </Card>
  );
}

export function CreativesClient({ rows }: { rows: AdRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
        <Leaderboard title="Top Performing (ROAS)" rows={topByRoas} />
        <Leaderboard title="Lowest Performing (ROAS)" rows={lowestByRoas} />
        <Leaderboard title="Highest CTR" rows={highestCtr} />
        <Leaderboard title="Lowest CPC" rows={lowestCpc} />
      </div>

      {compareRows.length > 0 && (
        <Card className="mb-4 overflow-x-auto p-4">
          <h3 className="mb-3 text-sm font-semibold">Comparing {compareRows.length} creatives</h3>
          <table className="w-full min-w-[500px] text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-2 font-medium">Creative</th>
                <th className="pb-2 font-medium">Spend</th>
                <th className="pb-2 font-medium">CTR</th>
                <th className="pb-2 font-medium">CPC</th>
                <th className="pb-2 font-medium">CPM</th>
                <th className="pb-2 font-medium">Conversions</th>
                <th className="pb-2 font-medium">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((ad) => (
                <tr key={ad.id} className="border-t border-border">
                  <td className="py-2">{ad.name}</td>
                  <td className="py-2">{formatCurrency(ad.spend)}</td>
                  <td className="py-2">{formatPercent(ad.ctr)}</td>
                  <td className="py-2">{formatCurrency(ad.cpc)}</td>
                  <td className="py-2">{formatCurrency(ad.cpm)}</td>
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
          <TabsTrigger value="all">All creatives</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <CreativeGrid rows={rows} selected={selected} onToggle={toggle} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
