# MetaBoard — Meta + Shopify Business Analytics Dashboard

A multi-tenant analytics dashboard built for an agency managing multiple clients. Ships fully
functional in **Demo Mode** with realistic seeded data; the real Meta Graph API and Shopify Admin API
integrations are fully wired server-side and activate the moment a client pastes in a token — no app
review or OAuth app setup required for either. Bilingual (English/Arabic, true RTL) with every
monetary value shown in the connected account's actual currency, never assumed.

## Stack

- **Next.js 16 (App Router) + TypeScript** — Server Components fetch data directly; Route Handlers
  and Server Actions keep Meta/Shopify tokens server-side only.
- **Prisma + Postgres** (`prisma/schema.prisma`) — a free Neon Postgres database, provisioned via Vercel's Storage tab.
- **Auth.js (NextAuth v5)** — credentials login, JWT sessions, org-scoped multi-tenancy.
- **Tailwind CSS v4 + Radix UI primitives**, **Recharts**, **TanStack Table**, **TanStack Query**.
- **Custom lightweight i18n** (`lib/i18n/`) — cookie-based locale, English/Arabic dictionaries, true RTL layout.

## Getting started

```bash
npm install
npm run db:seed     # creates the demo org, login, 2 demo clients, ~12k rows of realistic insight data
npm run dev
```

Open http://localhost:3000 and sign in with the pre-filled demo login:

```
band.digi.tech@gmail.com / demo1234
```

## Project structure

```
app/
  (auth)/login, register           – agency sign-in / workspace creation
  clients/                          – client picker (multi-tenant switcher)
  (dashboard)/[clientId]/           – sidebar layout + all dashboard sections, incl. unified/ (Meta+Shopify)
  api/meta/oauth/{start,callback}   – Meta Login OAuth flow (dormant until META_APP_ID/SECRET configured)
  api/reports/generate              – report builder data endpoint
lib/
  meta/        – real Graph API client + sync (server-only, never imported by client components)
  shopify/     – real Shopify Admin API client + sync (server-only)
  mock/        – deterministic realistic data generators (the Demo Mode dataset)
  data/        – *.service.ts — the ONLY thing pages call; picks live vs. demo data
  data/currency.ts     – resolves the connected ad account's real currency (never assumes USD)
  data/unified.service.ts – combines Meta spend with Shopify revenue + Meta-vs-Shopify reconciliation
  i18n/        – locale config, en/ar dictionaries, t() lookup, cookie read/write
  insights/    – rule-based AI insight + alert engine (every claim traceable to real numbers)
  security/    – AES-256-GCM token encryption at rest
prisma/schema.prisma                – multi-tenant data model (Organization → Client → AdAccount/ShopifyConnection → …)
```

## Connecting a real Meta account

Two ways, both on each client's **Account** page:

1. **Paste a token** (fastest — no Meta App needed): grab a token with `ads_read` access from the
   [Graph API Explorer](https://developers.facebook.com/tools/explorer/) and paste it in. Validates
   immediately and pulls the last 30 days of campaigns/ad sets/ads/creatives/insights.
2. **Full OAuth**: create an app at [developers.facebook.com/apps](https://developers.facebook.com/apps),
   add the Marketing API product, and set in `.env`:
   ```
   META_APP_ID=...
   META_APP_SECRET=...
   META_REDIRECT_URI=https://yourdomain.com/api/meta/oauth/callback
   ```
   Restart the app — the "Connect with Meta (full OAuth)" button becomes active.

Either way, `lib/meta/sync.ts` fetches everything from Meta **before** touching the database, then
writes it in one atomic transaction — a rate limit or network failure mid-sync never leaves stale or
partial data mislabeled as current; the client's last good sync (or its previous NOT_CONNECTED state)
is left untouched and the error surfaces on the Account page.

## Connecting a real Shopify store

On the same Account page: in the store's admin, go to **Settings → Apps and sales channels → Develop
apps**, create a custom app, grant it `read_orders` + `read_customers` scopes, install it, and paste
the generated Admin API access token plus the shop domain (`your-store.myshopify.com`). Same
fetch-everything-then-write-atomically safety model as Meta sync.

## Unified analytics (`/[clientId]/unified`)

Combines Meta ad spend with real Shopify order data — ROAS, AOV, cost per purchase, customer
acquisition cost, new vs. returning customers — **only when both sources are connected and report in
the same currency** (no silent currency conversion). A **Data Health** section compares "Meta reported
purchases" against "Shopify actual orders" for the same period and labels the result
Verified/Difference detected/Data unavailable — a gap between the two is explained as a normal
attribution-window difference, never auto-flagged as an error.

## Notes

- **Multi-tenant isolation**: every server-side query goes through `lib/data/scope.ts`, which resolves
  the signed-in user's organization and asserts any requested Client belongs to it. One client's Meta
  or Shopify data can never be read by another.
- **Demo vs. Live**: `InsightSnapshot.source` / `ShopifyOrderSnapshot.source` tag every row `DEMO` or
  `LIVE`; the topbar shows a matching badge so it's never ambiguous which the client is looking at.
  Live mode never silently falls back to demo numbers on an API error — it shows the error instead.
- **Currency**: `lib/data/currency.ts` reads the real currency Meta reported on the connected ad
  account and threads it through every monetary metric (KPI cards, tables, charts, AI insights/alerts).
  Never hardcoded, never auto-converted.
- **Language**: switch English/Arabic from the topbar. Arabic is true RTL (layout mirrors, not just
  text) with numbers kept in familiar Latin digits per common business-dashboard convention.
- Repo sits under a OneDrive-synced folder — if `npm run build`/`dev` ever fails with `EPERM` on
  `.next`, that's OneDrive locking files mid-sync; delete `.next` and retry, or exclude the project
  folder from OneDrive sync entirely for smoother local dev.
- The Neon free-tier database auto-suspends after idle periods; the first request after a while may
  briefly fail with a connection error and succeed on retry (a Neon cold-start, not an app bug).
