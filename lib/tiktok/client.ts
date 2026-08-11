// Server-only: thin wrapper around the TikTok for Business Marketing API v1.3.
// Docs verified against the official tiktok/tiktok-business-api-sdk repo
// (github.com/tiktok/tiktok-business-api-sdk) plus current third-party
// integration guides — see the plan file for exactly what was cross-checked.
//
// Important difference from lib/meta/client.ts and lib/shopify/client.ts:
// TikTok's response envelope is {code, message, data}, NOT an HTTP status
// code — a request can come back 200 OK with code !== 0 to signal an error
// (e.g. 40100-series = auth/permission errors, per TikTok's documented
// error-code ranges). Both must be checked.

const BASE_URL = "https://business-api.tiktok.com/open_api/v1.3";

export class TikTokApiError extends Error {
  constructor(
    message: string,
    public code: number,
    public isRateLimited = false,
    public isAuthError = false
  ) {
    super(message);
    this.name = "TikTokApiError";
  }
}

type Envelope<T> = { code: number; message: string; data: T; request_id?: string };

async function tiktokFetch<T>(
  path: string,
  accessToken: string | null,
  searchParams: Record<string, string> = {},
  method: "GET" | "POST" = "GET",
  body?: unknown
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers["Access-Token"] = accessToken;

  const res = await fetch(url.toString(), { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json()) as Envelope<T>;

  if (!res.ok || json.code !== 0) {
    const isAuthError = json.code === 40100 || json.code === 40101 || json.code === 40105 || res.status === 401;
    const isRateLimited = json.code === 40133 || res.status === 429 || /rate limit|too many/i.test(json.message ?? "");
    throw new TikTokApiError(json.message ?? `TikTok API request failed (${res.status})`, json.code ?? res.status, isRateLimited, isAuthError);
  }
  return json.data;
}

// ---------- OAuth / advertiser discovery ----------

export type TikTokTokenResponse = { access_token: string; advertiser_ids: string[]; scope: string[] };
/** POST /oauth2/access_token/ — exchanges the authorization code for a long-lived access token. */
export function exchangeCodeForToken(appId: string, secret: string, authCode: string) {
  return tiktokFetch<TikTokTokenResponse>("/oauth2/access_token/", null, {}, "POST", {
    app_id: appId,
    secret,
    auth_code: authCode,
  });
}

export type TikTokAdvertiserRef = { advertiser_id: string; advertiser_name: string };
/** GET /oauth2/advertiser/get/ — the advertiser accounts this access token can act on. */
export function getAuthorizedAdvertisers(appId: string, secret: string, accessToken: string) {
  return tiktokFetch<{ list: TikTokAdvertiserRef[] }>("/oauth2/advertiser/get/", null, {
    app_id: appId,
    secret,
    access_token: accessToken,
  });
}

export type TikTokAdvertiserInfo = {
  advertiser_id: string;
  name: string;
  currency: string;
  status: string; // STATUS_ENABLE | STATUS_DISABLE | ...
  timezone: string;
};
/** GET /advertiser/info/ — name/currency/status/timezone for the selected advertiser(s). */
export function getAdvertiserInfo(advertiserIds: string[], accessToken: string) {
  return tiktokFetch<{ list: TikTokAdvertiserInfo[] }>("/advertiser/info/", accessToken, {
    advertiser_ids: JSON.stringify(advertiserIds),
    fields: JSON.stringify(["advertiser_id", "name", "currency", "status", "timezone"]),
  });
}

// ---------- Campaigns / Ad Groups / Ads ----------

export type TikTokCampaign = {
  campaign_id: string;
  campaign_name: string;
  operation_status: string; // ENABLE | DISABLE
  secondary_status?: string; // CAMPAIGN_STATUS_DELETE | ...
  objective_type: string;
  budget: number;
  budget_mode: string; // BUDGET_MODE_DAY | BUDGET_MODE_TOTAL | BUDGET_MODE_INFINITE
  create_time: string;
};
export function getCampaigns(advertiserId: string, accessToken: string, page = 1) {
  return tiktokFetch<{ list: TikTokCampaign[]; page_info: { total_number: number; total_page: number } }>(
    "/campaign/get/",
    accessToken,
    { advertiser_id: advertiserId, page: String(page), page_size: "200" }
  );
}

export type TikTokAdGroup = {
  adgroup_id: string;
  adgroup_name: string;
  campaign_id: string;
  operation_status: string;
  budget: number;
  budget_mode: string;
  targeting?: unknown;
};
export function getAdGroups(advertiserId: string, campaignId: string, accessToken: string, page = 1) {
  return tiktokFetch<{ list: TikTokAdGroup[]; page_info: { total_number: number; total_page: number } }>(
    "/adgroup/get/",
    accessToken,
    { advertiser_id: advertiserId, filtering: JSON.stringify({ campaign_ids: [campaignId] }), page: String(page), page_size: "200" }
  );
}

export type TikTokAd = {
  ad_id: string;
  ad_name: string;
  adgroup_id: string;
  operation_status: string;
  video_id?: string;
  image_ids?: string[];
  ad_format?: string;
  ad_text?: string;
};
export function getAds(advertiserId: string, adGroupId: string, accessToken: string, page = 1) {
  return tiktokFetch<{ list: TikTokAd[]; page_info: { total_number: number; total_page: number } }>(
    "/ad/get/",
    accessToken,
    { advertiser_id: advertiserId, filtering: JSON.stringify({ adgroup_ids: [adGroupId] }), page: String(page), page_size: "200" }
  );
}

// ---------- Reporting ----------

export type TikTokDataLevel = "AUCTION_ADVERTISER" | "AUCTION_CAMPAIGN" | "AUCTION_ADGROUP" | "AUCTION_AD";

const CORE_METRICS = [
  "spend",
  "impressions",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "reach",
  "frequency",
  "conversion",
  "cost_per_conversion",
  "conversion_rate",
  "video_play_actions",
  "likes",
  "comments",
  "shares",
  "follows",
];
// Only populated when the advertiser has value-based/pixel purchase tracking configured —
// requested opportunistically; if TikTok rejects these for the account, the caller retries
// without them rather than fabricating a value (spec: never invent a metric TikTok doesn't provide).
const VALUE_METRICS = ["total_purchase_value"];

export type TikTokReportRow = {
  dimensions: Record<string, string>;
  metrics: Record<string, string>;
};

async function fetchReport(
  advertiserId: string,
  accessToken: string,
  dataLevel: TikTokDataLevel,
  dimensions: string[],
  metrics: string[],
  startDate: string,
  endDate: string,
  filtering?: Record<string, unknown>
) {
  return tiktokFetch<{ list: TikTokReportRow[]; page_info: { total_number: number; total_page: number } }>(
    "/report/integrated/get/",
    accessToken,
    {
      advertiser_id: advertiserId,
      report_type: "BASIC",
      data_level: dataLevel,
      dimensions: JSON.stringify(dimensions),
      metrics: JSON.stringify(metrics),
      start_date: startDate,
      end_date: endDate,
      page_size: "1000",
      ...(filtering ? { filtering: JSON.stringify(filtering) } : {}),
    }
  );
}

/**
 * Daily report for one object (account/campaign/ad group/ad) over a date
 * range. Tries value-based metrics first; on a rejection (not every ad
 * account has purchase-value tracking configured) transparently retries
 * without them so the sync doesn't fail outright — callers get
 * conversionValue = 0 for that sync rather than a crash, same convention
 * the rest of this app already uses for "no purchase tracking configured".
 */
export async function getDailyReport(
  advertiserId: string,
  accessToken: string,
  dataLevel: TikTokDataLevel,
  idDimension: string | null,
  idValue: string | null,
  startDate: string,
  endDate: string
): Promise<{ rows: TikTokReportRow[]; hasValueMetrics: boolean }> {
  const dimensions = idDimension ? [idDimension, "stat_time_day"] : ["stat_time_day"];
  const filtering = idDimension && idValue ? { [`${idDimension}s`]: [idValue] } : undefined;

  try {
    const { list } = await fetchReport(advertiserId, accessToken, dataLevel, dimensions, [...CORE_METRICS, ...VALUE_METRICS], startDate, endDate, filtering);
    return { rows: list, hasValueMetrics: true };
  } catch (err) {
    if (err instanceof TikTokApiError && !err.isAuthError && !err.isRateLimited) {
      // Likely an unsupported-metric rejection for this account/data_level — retry without value metrics.
      const { list } = await fetchReport(advertiserId, accessToken, dataLevel, dimensions, CORE_METRICS, startDate, endDate, filtering);
      return { rows: list, hasValueMetrics: false };
    }
    throw err;
  }
}
