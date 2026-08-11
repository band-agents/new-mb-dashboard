import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  makeRng,
  makeCampaignProfile,
  generateDailySeries,
  scaleSeries,
  DATASET_DAYS,
} from "../lib/mock/dataset";
import {
  PLACEMENTS,
  DEVICES,
  AGE_RANGES,
  GENDERS,
  REGIONS,
  campaignName,
  randomCreative,
} from "../lib/mock/catalog";
import { rngInt, rngRange, pick } from "../lib/mock/rng";

const prisma = new PrismaClient();

const DEMO_ORG_NAME = "Band Digital";
const DEMO_USER_EMAIL = "band.digi.tech@gmail.com";
const DEMO_USER_PASSWORD = "demo1234";

const CLIENTS = [
  { name: "Aurora Skincare", industry: "Ecommerce / Beauty", hue: 265, campaigns: 6, aov: 62 },
  { name: "Summit Fitness App", industry: "Health & Fitness App", hue: 155, campaigns: 5, aov: 34 },
];

function startOfWindow() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (DATASET_DAYS - 1));
  return d;
}

async function main() {
  console.log("Seeding demo data…");

  await prisma.alert.deleteMany();
  await prisma.reportConfig.deleteMany();
  await prisma.insightSnapshot.deleteMany();
  await prisma.creative.deleteMany();
  await prisma.ad.deleteMany();
  await prisma.adSet.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.adAccount.deleteMany();
  await prisma.metaConnection.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({ data: { name: DEMO_ORG_NAME } });

  const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: DEMO_USER_EMAIL,
      passwordHash,
      name: "Band Digital Admin",
      role: "OWNER",
    },
  });
  await prisma.userPreference.create({ data: { userId: user.id } });

  const windowStart = startOfWindow();

  for (const clientDef of CLIENTS) {
    const client = await prisma.client.create({
      data: {
        organizationId: org.id,
        name: clientDef.name,
        industry: clientDef.industry,
        avatarHue: clientDef.hue,
      },
    });

    await prisma.metaConnection.create({
      data: { clientId: client.id, status: "NOT_CONNECTED" },
    });

    const adAccount = await prisma.adAccount.create({
      data: {
        clientId: client.id,
        adPlatform: "META",
        externalAccountId: `demo_act_${client.id.slice(-8)}`,
        name: `${clientDef.name} — Primary Ad Account`,
        currency: "USD",
        status: "ACTIVE",
      },
    });

    const rng = makeRng(client.id);
    const accountBreakdownAgg: Record<string, { spend: number; impressions: number; clicks: number; conversions: number; conversionValue: number; reach: number }[]> =
      {};

    const insightRows: any[] = [];

    for (let ci = 0; ci < clientDef.campaigns; ci++) {
      const profile = makeCampaignProfile(rng, ci);
      const status = rng() < 0.15 ? "PAUSED" : rng() < 0.05 ? "ARCHIVED" : "ACTIVE";
      const name = campaignName(profile.objective, ci, rng);
      const dailyBudget = Math.round(rngRange(rng, 40, 500));

      const campaign = await prisma.campaign.create({
        data: {
          adAccountId: adAccount.id,
          externalCampaignId: `demo_camp_${client.id.slice(-6)}_${ci}`,
          name,
          status,
          objective: profile.objective,
          dailyBudget,
          startDate: windowStart,
        },
      });

      const series = generateDailySeries(rng, profile, windowStart, clientDef.aov);

      // campaign-level rows across full 90-day window
      for (const d of series) {
        insightRows.push({
          date: d.date,
          level: "CAMPAIGN",
          adAccountId: adAccount.id,
          campaignId: campaign.id,
          spend: d.spend,
          impressions: d.impressions,
          reach: d.reach,
          frequency: d.frequency,
          clicks: d.clicks,
          linkClicks: d.linkClicks,
          conversions: d.conversions,
          conversionValue: d.conversionValue,
          leads: d.leads,
          purchases: d.purchases,
          addToCart: d.addToCart,
          initiateCheckout: d.initiateCheckout,
          pageViews: d.pageViews,
          viewContent: d.viewContent,
          registrations: d.registrations,
          engagement: d.engagement,
          source: "DEMO",
        });
      }

      // account-level breakdown attribution (last 30 days) split off campaign spend
      const last30 = series.slice(-30);
      for (const d of last30) {
        const splitInto = (n: number, buckets: readonly string[], dim: "placement" | "device" | "ageRange" | "gender" | "region") => {
          let remaining = 1;
          const weights = buckets.map(() => rngRange(rng, 0.6, 1.4));
          const total = weights.reduce((a, b) => a + b, 0);
          buckets.forEach((bucket, idx) => {
            const w = weights[idx] / total;
            insightRows.push({
              date: d.date,
              level: "ACCOUNT",
              adAccountId: adAccount.id,
              campaignId: campaign.id,
              [dim]: bucket,
              spend: Number((d.spend * w).toFixed(2)),
              impressions: Math.round(d.impressions * w),
              reach: Math.round(d.reach * w),
              frequency: d.frequency,
              clicks: Math.round(d.clicks * w),
              linkClicks: Math.round(d.linkClicks * w),
              conversions: Math.round(d.conversions * w),
              conversionValue: Number((d.conversionValue * w).toFixed(2)),
              leads: Math.round(d.leads * w),
              purchases: Math.round(d.purchases * w),
              source: "DEMO",
            });
          });
        };
        splitInto(0, PLACEMENTS, "placement");
        splitInto(0, DEVICES, "device");
        splitInto(0, AGE_RANGES, "ageRange");
        splitInto(0, GENDERS, "gender");
        splitInto(0, REGIONS.slice(0, 5), "region");
      }

      // ad sets + ads (last 30 days of detail)
      const adSetCount = rngInt(rng, 2, 4);
      for (let asi = 0; asi < adSetCount; asi++) {
        const adSetShare = rngRange(rng, 0.15, 0.4);
        const adSetSeries = scaleSeries(last30, adSetShare);
        const targeting = {
          ageMin: pick(rng, [18, 22, 25, 30]),
          ageMax: pick(rng, [34, 44, 54, 65]),
          genders: pick(rng, [["All"], ["Female"], ["Male"]]),
          locations: [pick(rng, REGIONS)],
          interests: pick(rng, [
            ["Skincare", "Beauty"],
            ["Fitness", "Wellness"],
            ["Online shopping"],
            ["Technology"],
          ]),
        };
        const adSet = await prisma.adSet.create({
          data: {
            campaignId: campaign.id,
            externalAdSetId: `demo_adset_${campaign.id.slice(-6)}_${asi}`,
            name: `${name} — Ad Set ${asi + 1}`,
            status,
            dailyBudget: Math.round((dailyBudget * adSetShare) * 10) / 10,
            targetingSummary: JSON.stringify(targeting),
          },
        });

        for (const d of adSetSeries) {
          insightRows.push({
            date: d.date,
            level: "ADSET",
            adAccountId: adAccount.id,
            campaignId: campaign.id,
            adSetId: adSet.id,
            spend: d.spend,
            impressions: d.impressions,
            reach: d.reach,
            frequency: d.frequency,
            clicks: d.clicks,
            linkClicks: d.linkClicks,
            conversions: d.conversions,
            conversionValue: d.conversionValue,
            leads: d.leads,
            purchases: d.purchases,
            addToCart: d.addToCart,
            initiateCheckout: d.initiateCheckout,
            pageViews: d.pageViews,
            viewContent: d.viewContent,
            registrations: d.registrations,
            engagement: d.engagement,
            source: "DEMO",
          });
        }

        const adCount = rngInt(rng, 1, 3);
        for (let adi = 0; adi < adCount; adi++) {
          const adShare = rngRange(rng, 0.3, 0.7);
          const adSeries = scaleSeries(adSetSeries, adShare);
          const ad = await prisma.ad.create({
            data: {
              adSetId: adSet.id,
              externalAdId: `demo_ad_${adSet.id.slice(-6)}_${adi}`,
              name: `${name} — Creative ${String.fromCharCode(65 + adi)}`,
              status,
            },
          });
          const creativeSeed = Number(`${ci}${asi}${adi}${clientDef.hue}`);
          const creative = randomCreative(rng, creativeSeed);
          await prisma.creative.create({
            data: {
              adId: ad.id,
              name: ad.name,
              ...creative,
            },
          });

          for (const d of adSeries) {
            insightRows.push({
              date: d.date,
              level: "AD",
              adAccountId: adAccount.id,
              campaignId: campaign.id,
              adSetId: adSet.id,
              adId: ad.id,
              spend: d.spend,
              impressions: d.impressions,
              reach: d.reach,
              frequency: d.frequency,
              clicks: d.clicks,
              linkClicks: d.linkClicks,
              conversions: d.conversions,
              conversionValue: d.conversionValue,
              leads: d.leads,
              purchases: d.purchases,
              addToCart: d.addToCart,
              initiateCheckout: d.initiateCheckout,
              pageViews: d.pageViews,
              viewContent: d.viewContent,
              registrations: d.registrations,
              engagement: d.engagement,
              source: "DEMO",
            });
          }
        }
      }
    }

    // batch insert in chunks (SQLite has a bound-variable limit)
    const CHUNK = 300;
    for (let i = 0; i < insightRows.length; i += CHUNK) {
      await prisma.insightSnapshot.createMany({ data: insightRows.slice(i, i + CHUNK) });
    }
    console.log(`  ${clientDef.name}: ${insightRows.length} insight rows`);
  }

  console.log("Seed complete.");
  console.log(`Login with ${DEMO_USER_EMAIL} / ${DEMO_USER_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
