// Server-only: thin wrapper around the Meta Graph API / Marketing API.
// Every function here makes a real HTTP call — nothing here is mocked.
// Mirrored field-for-field by lib/mock/* so the data-layer services in
// lib/data/*.service.ts can swap between the two without changing callers.

import { env } from "@/lib/env";

const BASE_URL = `https://graph.facebook.com/${env.meta.apiVersion}`;

export class MetaApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: number,
    public isTokenExpired = false,
    public isRateLimited = false
  ) {
    super(message);
    this.name = "MetaApiError";
  }
}

type Paged<T> = { data: T[]; paging?: { cursors?: { after?: string }; next?: string } };

async function metaFetchUrl<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok || json.error) {
    const err = json.error ?? {};
    const isTokenExpired = err.code === 190;
    const isRateLimited = res.status === 429 || err.code === 4 || err.code === 17 || err.code === 32;
    throw new MetaApiError(err.message ?? `Meta API request failed (${res.status})`, res.status, err.code, isTokenExpired, isRateLimited);
  }
  return json as T;
}

async function metaFetch<T>(path: string, accessToken: string, searchParams: Record<string, string> = {}): Promise<T> {
  const params = new URLSearchParams({ access_token: accessToken, ...searchParams });
  return metaFetchUrl<T>(`${BASE_URL}${path}?${params.toString()}`);
}

/**
 * Follows Graph API cursor pagination (`paging.next`) until exhausted,
 * returning every row across every page — a fixed `limit` param alone
 * would silently truncate any account with more objects than that limit,
 * which is exactly the "pagination issue" a data-accuracy audit has to
 * catch. Capped at 50 pages (at limit=200/page, 10,000 objects) as a sane
 * upper bound; a real account beyond that needs a background job, not a
 * request-time sync.
 */
async function metaFetchPaginated<T>(path: string, accessToken: string, searchParams: Record<string, string>): Promise<T[]> {
  const results: T[] = [];
  const first = await metaFetch<Paged<T>>(path, accessToken, searchParams);
  results.push(...first.data);
  let next = first.paging?.next;
  for (let page = 0; page < 49 && next; page++) {
    const json = await metaFetchUrl<Paged<T>>(next);
    results.push(...json.data);
    next = json.paging?.next;
  }
  return results;
}

export type MetaAdAccount = { id: string; name: string; currency: string; account_status: number; timezone_name?: string };
export function getAdAccounts(accessToken: string) {
  return metaFetch<{ data: MetaAdAccount[] }>("/me/adaccounts", accessToken, {
    fields: "id,name,currency,account_status,timezone_name",
  });
}

export type MetaCampaign = {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
};
export function getCampaigns(adAccountId: string, accessToken: string) {
  return metaFetchPaginated<MetaCampaign>(`/${adAccountId}/campaigns`, accessToken, {
    fields: "id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time",
    limit: "200",
  });
}

export type MetaAdSet = { id: string; name: string; status: string; daily_budget?: string; targeting?: unknown };
export function getAdSets(campaignId: string, accessToken: string) {
  return metaFetchPaginated<MetaAdSet>(`/${campaignId}/adsets`, accessToken, {
    fields: "id,name,status,daily_budget,targeting",
    limit: "200",
  });
}

export type MetaAd = { id: string; name: string; status: string; creative?: { id: string } };
export function getAds(adSetId: string, accessToken: string) {
  return metaFetchPaginated<MetaAd>(`/${adSetId}/ads`, accessToken, {
    fields: "id,name,status,creative{id}",
    limit: "200",
  });
}

export type MetaCreative = {
  id: string;
  name?: string;
  thumbnail_url?: string;
  image_url?: string;
  object_type?: string;
  title?: string;
  body?: string;
  call_to_action_type?: string;
};
export function getCreative(creativeId: string, accessToken: string) {
  return metaFetch<MetaCreative>(`/${creativeId}`, accessToken, {
    fields: "name,thumbnail_url,image_url,object_type,title,body,call_to_action_type",
  });
}

export type MetaUser = { id: string; name?: string };
export function getMe(accessToken: string) {
  return metaFetch<MetaUser>("/me", accessToken, { fields: "id,name" });
}

export type MetaInsight = {
  date_start: string;
  spend: string;
  impressions: string;
  reach: string;
  frequency: string;
  clicks: string;
  ctr: string;
  cpc: string;
  cpm: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
};
export function getInsights(
  objectId: string,
  accessToken: string,
  opts: { since: string; until: string; breakdowns?: string[]; timeIncrement?: "1" | "7" | "monthly" }
) {
  return metaFetchPaginated<MetaInsight>(`/${objectId}/insights`, accessToken, {
    fields: "spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,action_values",
    time_range: JSON.stringify({ since: opts.since, until: opts.until }),
    time_increment: opts.timeIncrement ?? "1",
    ...(opts.breakdowns ? { breakdowns: opts.breakdowns.join(",") } : {}),
    limit: "500",
  });
}
