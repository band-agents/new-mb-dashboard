// Server-only: pulls real data from the Meta Graph API for one client and
// writes it into our own tables (Campaign/AdSet/Ad/Creative/InsightSnapshot),
// exactly like the mock generator does for Demo Mode. Every page reads from
// those tables, so once this has run once, the whole dashboard is "live".
//
// Data-accuracy invariant (spec §5/§10/§13): a sync either fully succeeds or
// makes no change at all. All Meta API calls happen FIRST, entirely in
// memory; only once every required fetch has succeeded do we touch the
// database, and that write is one atomic transaction. A rate limit,
// permission error, or network failure partway through never leaves the
// client with partial/blank data masquerading as a complete sync — the
// previous good data (or previous error state) is left untouched and the
// failure is surfaced to the caller.

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
  type MetaAd,
  type MetaAdAccount,
  type MetaAdSet,
  type MetaCampaign,
  type MetaCreative,
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

/** Retries once, after a short backoff, on a rate-limited response. Any other error (or a second rate limit) propagates. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof MetaApiError && err.isRateLimited) {
      await new Promise((r) => setTimeout(r, 2000));
      return await fn();
    }
    throw err;
  }
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

// ---------- Phase A: fetch everything from Meta, no DB writes ----------

type FetchedAd = { meta: MetaAd; creative: MetaCreative | null; insights: MetaInsight[] };
type FetchedAdSet = { meta: MetaAdSet; insights: MetaInsight[]; ads: FetchedAd[] };
type FetchedCampaign = { meta: MetaCampaign; insights: MetaInsight[]; adSets: FetchedAdSet[] };
type FetchedAccount = {
  account: MetaAdAccount;
  metaUserId: string | null;
  accountInsights: MetaInsight[];
  campaigns: FetchedCampaign[];
};

async function fetchAllFromMeta(accessToken: string): Promise<FetchedAccount> {
  const { data: accounts } = await withRetry(() => getAdAccounts(accessToken));
  if (accounts.length === 0) {
    throw new MetaApiError("This token has no ad accounts to read. Ask an admin for Ads access on at least one account.", 400);
  }
  const account = accounts.find((a) => a.account_status === 1) ?? accounts[0];
  const me = await getMe(accessToken).catch(() => null); // non-critical: only used for a display label

  const until = new Date();
  const since = new Date(until.getTime() - SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const range = { since: isoDate(since), until: isoDate(until), timeIncrement: "1" as const };

  const { data: accountInsights } = await withRetry(() => getInsights(account.id, accessToken, range));
  const { data: campaigns } = await withRetry(() => getCampaigns(account.id, accessToken));

  const fetchedCampaigns: FetchedCampaign[] = [];
  for (const c of campaigns) {
    const { data: campInsights } = await withRetry(() => getInsights(c.id, accessToken, range));
    const { data: adSets } = await withRetry(() => getAdSets(c.id, accessToken));

    const fetchedAdSets: FetchedAdSet[] = [];
    for (const as of adSets) {
      const { data: adSetInsights } = await withRetry(() => getInsights(as.id, accessToken, range));
      const { data: ads } = await withRetry(() => getAds(as.id, accessToken));

      const fetchedAds: FetchedAd[] = [];
      for (const a of ads) {
        const creative = a.creative?.id ? await withRetry(() => getCreative(a.creative!.id, accessToken)).catch(() => null) : null;
        const { data: adInsights } = await withRetry(() => getInsights(a.id, accessToken, range));
        fetchedAds.push({ meta: a, creative, insights: adInsights });
      }
      fetchedAdSets.push({ meta: as, insights: adSetInsights, ads: fetchedAds });
    }
    fetchedCampaigns.push({ meta: c, insights: campInsights, adSets: fetchedAdSets });
  }

  return { account, metaUserId: me?.id ?? null, accountInsights, campaigns: fetchedCampaigns };
}

// ---------- Phase B: one atomic DB write, only after Phase A fully succeeded ----------

async function writeToDatabase(clientId: string, accessToken: string, fetched: FetchedAccount): Promise<SyncResult> {
  const { account, metaUserId, accountInsights, campaigns } = fetched;
  let adCount = 0;

  await prisma.$transaction(
    async (tx) => {
      // Only now — after every Meta call above has already succeeded — do we touch existing data.
      await tx.adAccount.deleteMany({ where: { clientId } });

      const adAccount = await tx.adAccount.create({
        data: {
          clientId,
          metaAccountId: account.id,
          name: account.name,
          currency: account.currency,
          status: account.account_status === 1 ? "ACTIVE" : "PAUSED",
        },
      });

      if (accountInsights.length) {
        await tx.insightSnapshot.createMany({
          data: toSnapshotRows(accountInsights, { level: "ACCOUNT", adAccountId: adAccount.id }),
        });
      }

      for (const fc of campaigns) {
        const campaign = await tx.campaign.create({
          data: {
            adAccountId: adAccount.id,
            metaCampaignId: fc.meta.id,
            name: fc.meta.name,
            status: mapCampaignStatus(fc.meta.status),
            objective: mapObjective(fc.meta.objective ?? "TRAFFIC"),
            dailyBudget: fc.meta.daily_budget ? Number(fc.meta.daily_budget) / 100 : null,
            lifetimeBudget: fc.meta.lifetime_budget ? Number(fc.meta.lifetime_budget) / 100 : null,
            startDate: fc.meta.start_time ? new Date(fc.meta.start_time) : new Date(),
            endDate: fc.meta.stop_time ? new Date(fc.meta.stop_time) : null,
          },
        });

        if (fc.insights.length) {
          await tx.insightSnapshot.createMany({
            data: toSnapshotRows(fc.insights, { level: "CAMPAIGN", adAccountId: adAccount.id, campaignId: campaign.id }),
          });
        }

        for (const fas of fc.adSets) {
          const adSet = await tx.adSet.create({
            data: {
              campaignId: campaign.id,
              metaAdSetId: fas.meta.id,
              name: fas.meta.name,
              status: mapCampaignStatus(fas.meta.status),
              dailyBudget: fas.meta.daily_budget ? Number(fas.meta.daily_budget) / 100 : null,
              targetingSummary: JSON.stringify(fas.meta.targeting ?? {}),
            },
          });

          if (fas.insights.length) {
            await tx.insightSnapshot.createMany({
              data: toSnapshotRows(fas.insights, { level: "ADSET", adAccountId: adAccount.id, adSetId: adSet.id }),
            });
          }

          for (const fad of fas.ads) {
            const ad = await tx.ad.create({
              data: { adSetId: adSet.id, metaAdId: fad.meta.id, name: fad.meta.name, status: mapCampaignStatus(fad.meta.status) },
            });
            adCount++;

            if (fad.creative) {
              await tx.creative.create({
                data: {
                  adId: ad.id,
                  name: fad.creative.name || fad.meta.name,
                  format: fad.creative.image_url ? "IMAGE" : fad.creative.object_type === "VIDEO" ? "VIDEO" : "IMAGE",
                  thumbnailUrl: fad.creative.thumbnail_url || fad.creative.image_url || "",
                  headline: fad.creative.title || fad.meta.name,
                  body: fad.creative.body || "",
                  callToAction: fad.creative.call_to_action_type || "LEARN_MORE",
                },
              });
            }

            if (fad.insights.length) {
              await tx.insightSnapshot.createMany({
                data: toSnapshotRows(fad.insights, { level: "AD", adAccountId: adAccount.id, adId: ad.id }),
              });
            }
          }
        }
      }

      await tx.metaConnection.upsert({
        where: { clientId },
        update: {
          status: "CONNECTED",
          accessTokenEnc: encryptSecret(accessToken),
          tokenExpiresAt: null,
          metaUserId,
          lastSyncedAt: new Date(),
          lastError: null,
        },
        create: { clientId, status: "CONNECTED", accessTokenEnc: encryptSecret(accessToken), metaUserId, lastSyncedAt: new Date() },
      });
    },
    { timeout: 30_000 }
  );

  return { adAccountName: account.name, campaignCount: campaigns.length, adCount };
}

/**
 * Validates the token, fetches the full campaign/ad set/ad/creative/insights
 * tree from Meta, and only then replaces the client's data in one atomic
 * transaction. Throws MetaApiError (with a user-readable message) on
 * failure — the database is left exactly as it was before the call.
 */
export async function syncClientFromMeta(clientId: string, accessToken: string): Promise<SyncResult> {
  const fetched = await fetchAllFromMeta(accessToken);
  return writeToDatabase(clientId, accessToken, fetched);
}
