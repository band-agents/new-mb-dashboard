// Server-only: pulls real data from the Meta Graph API for one client and
// writes it into our own tables (Campaign/AdSet/Ad/Creative/InsightSnapshot),
// exactly like the mock generator does for Demo Mode. Every page reads from
// those tables, so once this has run once, the whole dashboard is "live".

import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/security/crypto";
import {
  MetaApiError,
  getAdAccounts,
  getAds,
  getAdSets,
  getCampaigns,
  getCreative,
  getInsights,
  getMe,
  type MetaInsight,
} from "./client";

const SYNC_WINDOW_DAYS = 30;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function mapCampaignStatus(status: string): string {
  if (status === "ACTIVE" || status === "PAUSED") return status;
  if (status === "DELETED" || status === "ARCHIVED") return "ARCHIVED";
  return "PAUSED";
}

function mapObjective(objective: string): string {
  const o = objective.toUpperCase();
  if (o.includes("AWARENESS") || o.includes("REACH") || o.includes("BRAND")) return "AWARENESS";
  if (o.includes("LEAD")) return "LEADS";
  if (o.includes("APP")) return "APP_PROMOTION";
  if (o.includes("SALES") || o.includes("CONVERSION") || o.includes("CATALOG")) return "SALES";
  if (o.includes("ENGAGEMENT") || o.includes("MESSAGE") || o.includes("VIDEO_VIEW") || o.includes("POST_ENGAGEMENT")) return "ENGAGEMENT";
  return "TRAFFIC";
}

/** Sums the `value` of any action(s) in a Meta actions[]/action_values[] array matching the given action_type prefixes. */
function sumActions(actions: { action_type: string; value: string }[] | undefined, matches: string[]): number {
  if (!actions) return 0;
  return actions
    .filter((a) => matches.some((m) => a.action_type.includes(m)))
    .reduce((sum, a) => sum + (Number(a.value) || 0), 0);
}

type InsightRowInput = {
  level: "ACCOUNT" | "CAMPAIGN" | "ADSET" | "AD";
  adAccountId: string;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
};

function toSnapshotRows(insights: MetaInsight[], target: InsightRowInput) {
  return insights.map((row) => ({
    date: new Date(row.date_start),
    level: target.level,
    adAccountId: target.adAccountId,
    campaignId: target.campaignId ?? null,
    adSetId: target.adSetId ?? null,
    adId: target.adId ?? null,
    spend: Number(row.spend) || 0,
    impressions: Number(row.impressions) || 0,
    reach: Number(row.reach) || 0,
    frequency: Number(row.frequency) || 0,
    clicks: Number(row.clicks) || 0,
    linkClicks: sumActions(row.actions, ["link_click"]),
    conversions: sumActions(row.actions, ["purchase", "lead", "complete_registration"]),
    conversionValue: sumActions(row.action_values, ["purchase"]),
    leads: sumActions(row.actions, ["lead"]),
    purchases: sumActions(row.actions, ["purchase"]),
    addToCart: sumActions(row.actions, ["add_to_cart"]),
    initiateCheckout: sumActions(row.actions, ["initiate_checkout"]),
    pageViews: sumActions(row.actions, ["landing_page_view", "page_view"]),
    viewContent: sumActions(row.actions, ["view_content"]),
    registrations: sumActions(row.actions, ["complete_registration"]),
    engagement: sumActions(row.actions, ["post_engagement"]),
    source: "LIVE" as const,
  }));
}

export type SyncResult = {
  adAccountName: string;
  campaignCount: number;
  adCount: number;
};

/**
 * Validates the token, picks an ad account, wipes any previously-synced data
 * for this client, and pulls fresh campaigns/ad sets/ads/creatives/insights.
 * Throws MetaApiError (with a user-readable message) on failure.
 */
export async function syncClientFromMeta(clientId: string, accessToken: string): Promise<SyncResult> {
  const { data: accounts } = await getAdAccounts(accessToken);
  if (accounts.length === 0) {
    throw new MetaApiError("This token has no ad accounts to read. Ask an admin for Ads access on at least one account.", 400);
  }
  const account = accounts.find((a) => a.account_status === 1) ?? accounts[0];
  const me = await getMe(accessToken).catch(() => null);

  const until = new Date();
  const since = new Date(until.getTime() - SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const range = { since: isoDate(since), until: isoDate(until), timeIncrement: "1" as const };

  // Wipe any previously-synced (or demo) data for this client so views don't mix sources.
  await prisma.adAccount.deleteMany({ where: { clientId } });

  const adAccount = await prisma.adAccount.create({
    data: {
      clientId,
      metaAccountId: account.id,
      name: account.name,
      currency: account.currency,
      status: account.account_status === 1 ? "ACTIVE" : "PAUSED",
    },
  });

  // Account-level daily totals (drives Overview/Audiences account rollups).
  const acctInsights = await getInsights(account.id, accessToken, range).catch(() => ({ data: [] }));
  if (acctInsights.data.length) {
    await prisma.insightSnapshot.createMany({
      data: toSnapshotRows(acctInsights.data, { level: "ACCOUNT", adAccountId: adAccount.id }),
    });
  }

  const { data: campaigns } = await getCampaigns(account.id, accessToken);
  let adCount = 0;

  for (const c of campaigns) {
    const campaign = await prisma.campaign.create({
      data: {
        adAccountId: adAccount.id,
        metaCampaignId: c.id,
        name: c.name,
        status: mapCampaignStatus(c.status),
        objective: mapObjective(c.objective ?? "TRAFFIC"),
        dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
        lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
        startDate: c.start_time ? new Date(c.start_time) : new Date(),
        endDate: c.stop_time ? new Date(c.stop_time) : null,
      },
    });

    const campInsights = await getInsights(c.id, accessToken, range).catch(() => ({ data: [] }));
    if (campInsights.data.length) {
      await prisma.insightSnapshot.createMany({
        data: toSnapshotRows(campInsights.data, { level: "CAMPAIGN", adAccountId: adAccount.id, campaignId: campaign.id }),
      });
    }

    const { data: adSets } = await getAdSets(c.id, accessToken).catch(() => ({ data: [] as never[] }));
    for (const as of adSets) {
      const adSet = await prisma.adSet.create({
        data: {
          campaignId: campaign.id,
          metaAdSetId: as.id,
          name: as.name,
          status: mapCampaignStatus(as.status),
          dailyBudget: as.daily_budget ? Number(as.daily_budget) / 100 : null,
          targetingSummary: JSON.stringify(as.targeting ?? {}),
        },
      });

      const adSetInsights = await getInsights(as.id, accessToken, range).catch(() => ({ data: [] }));
      if (adSetInsights.data.length) {
        await prisma.insightSnapshot.createMany({
          data: toSnapshotRows(adSetInsights.data, { level: "ADSET", adAccountId: adAccount.id, adSetId: adSet.id }),
        });
      }

      const { data: ads } = await getAds(as.id, accessToken).catch(() => ({ data: [] as never[] }));
      for (const a of ads) {
        const ad = await prisma.ad.create({
          data: { adSetId: adSet.id, metaAdId: a.id, name: a.name, status: mapCampaignStatus(a.status) },
        });
        adCount++;

        if (a.creative?.id) {
          const creative = await getCreative(a.creative.id, accessToken).catch(() => null);
          if (creative) {
            await prisma.creative.create({
              data: {
                adId: ad.id,
                name: creative.name || a.name,
                format: creative.image_url ? "IMAGE" : creative.object_type === "VIDEO" ? "VIDEO" : "IMAGE",
                thumbnailUrl: creative.thumbnail_url || creative.image_url || "",
                headline: creative.title || a.name,
                body: creative.body || "",
                callToAction: creative.call_to_action_type || "LEARN_MORE",
              },
            });
          }
        }

        const adInsights = await getInsights(a.id, accessToken, range).catch(() => ({ data: [] }));
        if (adInsights.data.length) {
          await prisma.insightSnapshot.createMany({
            data: toSnapshotRows(adInsights.data, { level: "AD", adAccountId: adAccount.id, adId: ad.id }),
          });
        }
      }
    }
  }

  await prisma.metaConnection.upsert({
    where: { clientId },
    update: {
      status: "CONNECTED",
      accessTokenEnc: encryptSecret(accessToken),
      tokenExpiresAt: null,
      metaUserId: me?.id ?? null,
      lastSyncedAt: new Date(),
      lastError: null,
    },
    create: {
      clientId,
      status: "CONNECTED",
      accessTokenEnc: encryptSecret(accessToken),
      metaUserId: me?.id ?? null,
      lastSyncedAt: new Date(),
    },
  });

  return { adAccountName: account.name, campaignCount: campaigns.length, adCount };
}
