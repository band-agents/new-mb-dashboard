export const OBJECTIVES = [
  "AWARENESS",
  "TRAFFIC",
  "ENGAGEMENT",
  "LEADS",
  "APP_PROMOTION",
  "SALES",
] as const;

export const PLACEMENTS = [
  "Facebook Feed",
  "Instagram Feed",
  "Instagram Stories",
  "Instagram Reels",
  "Facebook Reels",
  "Audience Network",
  "Facebook Marketplace",
  "Messenger Inbox",
] as const;

export const DEVICES = ["Mobile", "Desktop", "Tablet"] as const;
export const PLATFORMS = ["facebook", "instagram", "audience_network", "messenger"] as const;
export const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;
export const GENDERS = ["Female", "Male", "Unknown"] as const;
export const REGIONS = [
  "California",
  "New York",
  "Texas",
  "Florida",
  "Illinois",
  "Washington",
  "Ontario",
  "United Kingdom",
];

export const CREATIVE_FORMATS = ["IMAGE", "VIDEO", "CAROUSEL", "COLLECTION"] as const;
export const CALLS_TO_ACTION = [
  "SHOP_NOW",
  "LEARN_MORE",
  "SIGN_UP",
  "DOWNLOAD",
  "GET_OFFER",
  "SUBSCRIBE",
] as const;

const CAMPAIGN_NAME_PARTS: Record<string, string[]> = {
  AWARENESS: ["Brand Awareness — Reach", "Category Introduction", "Video Views — Story Launch"],
  TRAFFIC: ["Traffic — Landing Page Push", "Site Visits — New Collection", "Blog Traffic Boost"],
  ENGAGEMENT: ["Engagement — Community Growth", "Post Engagement — UGC Push", "Follower Growth"],
  LEADS: ["Lead Gen — Instant Form", "Newsletter Signups", "Free Consultation Leads"],
  APP_PROMOTION: ["App Installs — Global", "App Retargeting — Reactivation", "App Installs — iOS"],
  SALES: ["Conversions — Retargeting", "Prospecting — Lookalike 1%", "Catalog Sales — Dynamic", "Holiday Sale Push"],
};

export function campaignName(objective: string, index: number, rng: () => number) {
  const options = CAMPAIGN_NAME_PARTS[objective] ?? ["Campaign"];
  const base = options[index % options.length];
  return `${base} ${["Q1", "Q2", "Q3", "Q4"][Math.floor(rng() * 4)]}`;
}

const CREATIVE_HEADLINES = [
  "Your new favorite, delivered fast",
  "Limited time: 20% off everything",
  "Built for people who don't settle",
  "Join 50,000+ happy customers",
  "The upgrade you've been waiting for",
  "Small changes. Big results.",
  "Loved by critics. Used by everyone.",
  "Real results in 14 days or less",
];

const CREATIVE_BODIES = [
  "Discover why customers keep coming back — premium quality, honest pricing, fast shipping.",
  "We built this for real life. Try it risk-free for 30 days.",
  "Thousands of five-star reviews can't be wrong. See what the hype is about.",
  "Designed with you in mind. Shop the collection before it sells out.",
];

export function randomCreative(rng: () => number, seed: number) {
  const format = CREATIVE_FORMATS[Math.floor(rng() * CREATIVE_FORMATS.length)];
  const headline = CREATIVE_HEADLINES[Math.floor(rng() * CREATIVE_HEADLINES.length)];
  const body = CREATIVE_BODIES[Math.floor(rng() * CREATIVE_BODIES.length)];
  const cta = CALLS_TO_ACTION[Math.floor(rng() * CALLS_TO_ACTION.length)];
  return {
    format,
    headline,
    body,
    callToAction: cta,
    thumbnailUrl: `https://picsum.photos/seed/mbdash-${seed}/480/480`,
  };
}
