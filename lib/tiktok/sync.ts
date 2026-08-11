// Server-only: pulls real data from the TikTok Marketing API for one client
// and writes it into the SAME normalized tables lib/meta/sync.ts uses,
// tagged adPlatform: "TIKTOK" — see prisma/schema.prisma's header comment
// and lib/platforms/types.ts. Same data-accuracy invariant as Meta/Shopify
// sync: every API call happens first, fully in memory; the database is
// touched once, atomically, only after everything succeeded.
//
// What TikTok's BASIC report does NOT reliably distinguish (documented
// here rather than guessed at): a single generic `conversion` metric
// covers whatever event the ad group is optimizing for — TikTok's BASIC
// report does not split it into purchases vs. leads vs. add-to-cart the
// way Meta's `actions[]` array does. Rather than guess which bucket a
// TikTok conversion belongs in, this sync writes the real count into
// `conversions` only and leaves leads/purchases/addToCart/etc at 0 for
// TikTok rows — never fabricating a funnel-stage split TikTok's API
// didn't actually provide. `conversionValue` is populated only when the
// advertiser has purchase-value tracking configured (see
// lib/tiktok/client.ts's getDailyReport).

import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/security/crypto";
import {
  TikTokApiError,
  getAdGroups,
  getAdvertiserInfo,
  getAds,
  getCampaigns,
  getDailyReport,
  type TikTokAd,
  type TikTokAdGroup,
  type TikTokAdvertiserInfo,
  type TikTokCampaign,
  type TikTokReportRow,
} from "./client";

const SYNC_WINDOW_DAYS = 30;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function mapStatus(operationStatus: string, secondaryStatus?: string): string {
  if (secondaryStatus?.includes("DELETE")) return "ARCHIVED";
  if (operationStatus === "ENABLE") return "ACTIVE";
  if (operationStatus === "DISABLE") return "PAUSED";
  return "PAUSED";
}

function mapObjective(objectiveType: string): string {
  const o = objectiveType.toUpperCase();
  if (o.includes("REACH") || o.includes("AWARENESS") || o.includes("BRAND")) return "AWARENESS";
  if (o.includes("LEAD")) return "LEADS";
  if (o.includes("APP")) return "APP_PROMOTION";
  if (o.includes("SALES") || o.includes("CONVERSION") || o.includes("CATALOG")) return "SALES";
  if (o.includes("ENGAGEMENT") || o.includes("VIDEO_VIEW") || o.includes("FOLLOWERS") || o.includes("TRAFFIC")) return o.includes("TRAFFIC") ? "TRAFFIC" : "ENGAGEMENT";
  return "TRAFFIC";
}

function num(metrics: Record<string, string>, key: string): number {
  const v = Number(metrics[key]);
  return Number.isFinite(v) ? v : 0;
}

type InsightRowInput = {
  level: "ACCOUNT" | "CAMPAIGN" | "ADSET" | "AD";
  adAccountId: string;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
};

function toSnapshotRows(rows: TikTokReportRow[], hasValueMetrics: boolean, target: InsightRowInput) {
  return rows.map((row) => {
    const m = row.metrics;
    const likes = num(m, "likes");
    const comments = num(m, "comments");
    const shares = num(m, "shares");
    return {
      date: new Date((row.dimensions.stat_time_day ?? "").slice(0, 10)),
      level: target.level,
      adAccountId: target.adAccountId,
      campaignId: target.campaignId ?? null,
      adSetId: target.adSetId ?? null,
      adId: target.adId ?? null,
      spend: num(m, "spend"),
      impressions: num(m, "impressions"),
      reach: num(m, "reach"),
      frequency: num(m, "frequency"),
      clicks: num(m, "clicks"),
      linkClicks: num(m, "clicks"), // TikTok's `clicks` is already a destination-click count, no separate "link click" concept
      conversions: num(m, "conversion"),
      conversionValue: hasValueMetrics ? num(m, "total_purchase_value") : 0,
      leads: 0, // see file docblock — TikTok's BASIC report doesn't split conversion type
      purchases: 0,
      addToCart: 0,
      initiateCheckout: 0,
      pageViews: 0,
      viewContent: 0,
      registrations: 0,
      engagement: likes + comments + shares,
      videoViews: num(m, "video_play_actions"),
      likes,
      comments,
      shares,
      follows: num(m, "follows"),
      source: "LIVE" as const,
    };
  });
}

export type TikTokSyncResult = { advertiserName: string; campaignCount: number; adCount: number };

type FetchedAd = { meta: TikTokAd; insights: TikTokReportRow[]; hasValueMetrics: boolean };
type FetchedAdGroup = { meta: TikTokAdGroup; insights: TikTokReportRow[]; hasValueMetrics: boolean; ads: FetchedAd[] };
type FetchedCampaign = { meta: TikTokCampaign; insights: TikTokReportRow[]; hasValueMetrics: boolean; adGroups: FetchedAdGroup[] };

async function fetchAllFromTikTok(accessToken: string, advertiserId: string) {
  const { list: advertisers } = await getAdvertiserInfo([advertiserId], accessToken);
  const advertiser = advertisers[0];
  if (!advertiser) throw new TikTokApiError("This advertiser account could not be found or isn't accessible with this token.", 40002, false, false);

  const until = new Date();
  const since = new Date(until.getTime() - SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const startDate = isoDate(since);
  const endDate = isoDate(until);

  const accountReport = await getDailyReport(advertiserId, accessToken, "AUCTION_ADVERTISER", null, null, startDate, endDate);

  const campaigns: TikTokCampaign[] = [];
  for (let page = 1; ; page++) {
    const { list, page_info } = await getCampaigns(advertiserId, accessToken, page);
    campaigns.push(...list);
    if (page >= page_info.total_page) break;
  }

  const fetchedCampaigns: FetchedCampaign[] = [];
  for (const c of campaigns) {
    const campReport = await getDailyReport(advertiserId, accessToken, "AUCTION_CAMPAIGN", "campaign_id", c.campaign_id, startDate, endDate);

    const adGroups: TikTokAdGroup[] = [];
    for (let page = 1; ; page++) {
      const { list, page_info } = await getAdGroups(advertiserId, c.campaign_id, accessToken, page);
      adGroups.push(...list);
      if (page >= page_info.total_page || page_info.total_page === 0) break;
    }

    const fetchedAdGroups: FetchedAdGroup[] = [];
    for (const ag of adGroups) {
      const agReport = await getDailyReport(advertiserId, accessToken, "AUCTION_ADGROUP", "adgroup_id", ag.adgroup_id, startDate, endDate);

      const ads: TikTokAd[] = [];
      for (let page = 1; ; page++) {
        const { list, page_info } = await getAds(advertiserId, ag.adgroup_id, accessToken, page);
        ads.push(...list);
        if (page >= page_info.total_page || page_info.total_page === 0) break;
      }

      const fetchedAds: FetchedAd[] = [];
      for (const a of ads) {
        const adReport = await getDailyReport(advertiserId, accessToken, "AUCTION_AD", "ad_id", a.ad_id, startDate, endDate);
        fetchedAds.push({ meta: a, insights: adReport.rows, hasValueMetrics: adReport.hasValueMetrics });
      }
      fetchedAdGroups.push({ meta: ag, insights: agReport.rows, hasValueMetrics: agReport.hasValueMetrics, ads: fetchedAds });
    }
    fetchedCampaigns.push({ meta: c, insights: campReport.rows, hasValueMetrics: campReport.hasValueMetrics, adGroups: fetchedAdGroups });
  }

  return { advertiser, accountReport, campaigns: fetchedCampaigns };
}

async function writeToDatabase(
  clientId: string,
  accessToken: string,
  advertiserId: string,
  fetched: Awaited<ReturnType<typeof fetchAllFromTikTok>>
): Promise<TikTokSyncResult> {
  const { advertiser, accountReport, campaigns } = fetched;
  let adCount = 0;

  await prisma.$transaction(
    async (tx) => {
      // Scoped to adPlatform: "TIKTOK" so this never touches the client's Meta data.
      await tx.adAccount.deleteMany({ where: { clientId, adPlatform: "TIKTOK" } });

      const adAccount = await tx.adAccount.create({
        data: {
          clientId,
          adPlatform: "TIKTOK",
          externalAccountId: advertiser.advertiser_id,
          name: advertiser.name,
          currency: advertiser.currency,
          status: advertiser.status === "STATUS_ENABLE" ? "ACTIVE" : "PAUSED",
          timezone: advertiser.timezone || "UTC",
        },
      });

      if (accountReport.rows.length) {
        await tx.insightSnapshot.createMany({
          data: toSnapshotRows(accountReport.rows, accountReport.hasValueMetrics, { level: "ACCOUNT", adAccountId: adAccount.id }),
        });
      }

      for (const fc of campaigns) {
        const campaign = await tx.campaign.create({
          data: {
            adAccountId: adAccount.id,
            externalCampaignId: fc.meta.campaign_id,
            name: fc.meta.campaign_name,
            status: mapStatus(fc.meta.operation_status, fc.meta.secondary_status),
            objective: mapObjective(fc.meta.objective_type ?? "TRAFFIC"),
            dailyBudget: fc.meta.budget_mode === "BUDGET_MODE_DAY" ? fc.meta.budget : null,
            lifetimeBudget: fc.meta.budget_mode === "BUDGET_MODE_TOTAL" ? fc.meta.budget : null,
            startDate: fc.meta.create_time ? new Date(fc.meta.create_time) : new Date(),
          },
        });

        if (fc.insights.length) {
          await tx.insightSnapshot.createMany({
            data: toSnapshotRows(fc.insights, fc.hasValueMetrics, { level: "CAMPAIGN", adAccountId: adAccount.id, campaignId: campaign.id }),
          });
        }

        for (const fag of fc.adGroups) {
          const adSet = await tx.adSet.create({
            data: {
              campaignId: campaign.id,
              externalAdSetId: fag.meta.adgroup_id,
              name: fag.meta.adgroup_name,
              status: mapStatus(fag.meta.operation_status),
              dailyBudget: fag.meta.budget_mode === "BUDGET_MODE_DAY" ? fag.meta.budget : null,
              targetingSummary: JSON.stringify(fag.meta.targeting ?? {}),
            },
          });

          if (fag.insights.length) {
            await tx.insightSnapshot.createMany({
              data: toSnapshotRows(fag.insights, fag.hasValueMetrics, { level: "ADSET", adAccountId: adAccount.id, adSetId: adSet.id }),
            });
          }

          for (const fad of fag.ads) {
            const ad = await tx.ad.create({
              data: { adSetId: adSet.id, externalAdId: fad.meta.ad_id, name: fad.meta.ad_name, status: mapStatus(fad.meta.operation_status) },
            });
            adCount++;

            // TikTok ad creatives are near-universally video; store what the API gives us as a
            // VIDEO-format creative row (no separate creative-asset endpoint call here — the
            // ad object itself carries the display text/format).
            await tx.creative.create({
              data: {
                adId: ad.id,
                name: fad.meta.ad_name,
                format: fad.meta.image_ids?.length ? "IMAGE" : "VIDEO",
                thumbnailUrl: "",
                headline: fad.meta.ad_name,
                body: fad.meta.ad_text ?? "",
                callToAction: "LEARN_MORE",
              },
            });

            if (fad.insights.length) {
              await tx.insightSnapshot.createMany({
                data: toSnapshotRows(fad.insights, fad.hasValueMetrics, { level: "AD", adAccountId: adAccount.id, adId: ad.id }),
              });
            }
          }
        }
      }

      await tx.tikTokConnection.upsert({
        where: { clientId },
        update: {
          status: "CONNECTED",
          accessTokenEnc: encryptSecret(accessToken),
          advertiserId,
          advertiserName: advertiser.name,
          advertiserCurrency: advertiser.currency,
          lastSyncedAt: new Date(),
          lastError: null,
        },
        create: {
          clientId,
          status: "CONNECTED",
          accessTokenEnc: encryptSecret(accessToken),
          advertiserId,
          advertiserName: advertiser.name,
          advertiserCurrency: advertiser.currency,
          lastSyncedAt: new Date(),
        },
      });
    },
    { timeout: 30_000 }
  );

  return { advertiserName: advertiser.name, campaignCount: campaigns.length, adCount };
}

/**
 * Validates the token against the given advertiser, fetches the full
 * campaign/ad group/ad/insights tree from TikTok, and only then replaces
 * the client's TikTok data in one atomic transaction. Throws TikTokApiError
 * (with a user-readable message) on failure — the database is left exactly
 * as it was before the call.
 */
export async function syncClientFromTikTok(clientId: string, accessToken: string, advertiserId: string): Promise<TikTokSyncResult> {
  const fetched = await fetchAllFromTikTok(accessToken, advertiserId);
  return writeToDatabase(clientId, accessToken, advertiserId, fetched);
}

export { TikTokApiError };
