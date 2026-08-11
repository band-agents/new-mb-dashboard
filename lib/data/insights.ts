import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { AdPlatform } from "@/lib/platforms/types";

export type InsightLevel = "ACCOUNT" | "CAMPAIGN" | "ADSET" | "AD";

export type InsightFilter = {
  clientId: string;
  start: Date;
  end: Date;
  level?: InsightLevel;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  campaignStatus?: string[];
  objective?: string[];
  /** Which advertising platform's rows to read. Defaults to "META" so every
   * existing caller keeps its exact pre-TikTok behavior until it's
   * explicitly updated to pass the platform switcher's selection. Pass
   * `undefined` explicitly (not just omitting the key) for an "all
   * platforms" combined query. */
  platform?: AdPlatform | "ALL";
};

/** Fetches raw InsightSnapshot rows scoped to a client's ad account(s), date range, level, and platform. */
export async function getInsightRows(filter: InsightFilter) {
  const platform = filter.platform ?? "META";
  const where: Prisma.InsightSnapshotWhereInput = {
    adAccount: { clientId: filter.clientId, ...(platform === "ALL" ? {} : { adPlatform: platform }) },
    date: { gte: filter.start, lte: filter.end },
  };
  if (filter.level) where.level = filter.level;
  if (filter.campaignId) where.campaignId = filter.campaignId;
  if (filter.adSetId) where.adSetId = filter.adSetId;
  if (filter.adId) where.adId = filter.adId;

  if (filter.campaignStatus?.length || filter.objective?.length) {
    where.campaign = {
      ...(filter.campaignStatus?.length ? { status: { in: filter.campaignStatus } } : {}),
      ...(filter.objective?.length ? { objective: { in: filter.objective } } : {}),
    };
  }

  return prisma.insightSnapshot.findMany({ where, orderBy: { date: "asc" } });
}

/** Groups rows by ISO date string -> array (for time-series charts). */
export function groupByDate<T extends { date: Date }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}

export function groupByWeek<T extends { date: Date }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const d = new Date(r.date);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}

export function groupByMonth<T extends { date: Date }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 7);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}
