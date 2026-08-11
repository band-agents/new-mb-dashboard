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

async function metaFetch<T>(path: string, accessToken: string, searchParams: Record<string, string> = {}): Promise<T> {
  const params = new URLSearchParams({ access_token: accessToken, ...searchParams });
  const res = await fetch(`${BASE_URL}${path}?${params.toString()}`);
  const json = await res.json();

  if (!res.ok || json.error) {
    const err = json.error ?? {};
    const isTokenExpired = err.code === 190;
    const isRateLimited = res.status === 429 || err.code === 4 || err.code === 17 || err.code === 32;
    throw new MetaApiError(err.message ?? `Meta API request failed (${res.status})`, res.status, err.code, isTokenExpired, isRateLimited);
  }
  return json as T;
}

export type MetaAdAccount = { id: string; name: string; currency: string; account_status: number };
export function getAdAccounts(accessToken: string) {
  return metaFetch<{ data: MetaAdAccount[] }>("/me/adaccounts", accessToken, {
    fields: "id,name,currency,account_status",
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
  return metaFetch<{ data: MetaCampaign[] }>(`/${adAccountId}/campaigns`, accessToken, {
    fields: "id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time",
    limit: "200",
  });
}

export type MetaAdSet = { id: string; name: string; status: string; daily_budget?: string; targeting?: unknown };
export function getAdSets(campaignId: string, accessToken: string) {
  return metaFetch<{ data: MetaAdSet[] }>(`/${campaignId}/adsets`, accessToken, {
    fields: "id,name,status,daily_budget,targeting",
    limit: "200",
  });
}

export type MetaAd = { id: string; name: string; status: string; creative?: { id: string } };
export function getAds(adSetId: string, accessToken: string) {
  return metaFetch<{ data: MetaAd[] }>(`/${adSetId}/ads`, accessToken, {
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
  return metaFetch<{ data: MetaInsight[] }>(`/${objectId}/insights`, accessToken, {
    fields: "spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,action_values",
    time_range: JSON.stringify({ since: opts.since, until: opts.until }),
    time_increment: opts.timeIncrement ?? "1",
    ...(opts.breakdowns ? { breakdowns: opts.breakdowns.join(",") } : {}),
    limit: "500",
  });
}
