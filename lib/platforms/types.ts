// Shared platform contract. Every advertising-platform adapter
// (lib/meta/sync.ts, lib/tiktok/sync.ts) writes into the same
// AdAccount/Campaign/AdSet/Ad/InsightSnapshot tables tagged by AdPlatform —
// see prisma/schema.prisma's header comment. lib/data/*.service.ts is the
// one place every page reads from, filtered by this discriminator, so
// adding a future platform (e.g. Google Ads) means writing a new
// lib/<platform>/{client,sync}.ts, not a new dashboard.

export const AD_PLATFORMS = ["META", "TIKTOK"] as const;
export type AdPlatform = (typeof AD_PLATFORMS)[number];

/** Platform-aware terminology — same components render either platform, just with different labels (spec: Meta "Ad Set" vs TikTok "Ad Group"). */
export const PLATFORM_TERMINOLOGY: Record<AdPlatform, { adSet: string; adSetPlural: string }> = {
  META: { adSet: "Ad Set", adSetPlural: "Ad Sets" },
  TIKTOK: { adSet: "Ad Group", adSetPlural: "Ad Groups" },
};

export const PLATFORM_LABEL: Record<AdPlatform, string> = {
  META: "Meta Ads",
  TIKTOK: "TikTok Ads",
};
