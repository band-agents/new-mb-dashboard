# MetaBoard — Meta Business Analytics Dashboard

A multi-tenant Meta Ads analytics dashboard built for an agency managing multiple clients. Ships fully
functional in **Demo Mode** with realistic seeded data; the real Meta OAuth + Graph/Marketing API
integration is fully wired server-side and activates the moment you add Meta App credentials.

## Stack

- **Next.js 16 (App Router) + TypeScript** — Server Components fetch data directly; Route Handlers
  and Server Actions keep Meta tokens server-side only.
- **Prisma + SQLite** (`prisma/schema.prisma`) — Postgres-compatible; swap `provider`/`DATABASE_URL` for production.
- **Auth.js (NextAuth v5)** — credentials login, JWT sessions, org-scoped multi-tenancy.
- **Tailwind CSS v4 + Radix UI primitives**, **Recharts**, **TanStack Table**, **TanStack Query**.

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
  (dashboard)/[clientId]/           – sidebar layout + all 12 dashboard sections
  api/meta/oauth/{start,callback}   – Meta Login OAuth flow (dormant until configured)
  api/reports/generate              – report builder data endpoint
lib/
  meta/        – real Graph API client + OAuth (server-only, never imported by client components)
  mock/        – deterministic realistic data generators (the Demo Mode dataset)
  data/        – *.service.ts — the ONLY thing pages call; picks live vs. demo data
  insights/    – rule-based AI insight + alert engine (every claim traceable to real numbers)
  security/    – AES-256-GCM token encryption at rest
prisma/schema.prisma                – multi-tenant data model (Organization → Client → AdAccount → …)
```

## Connecting a real Meta account

1. Create an app at [developers.facebook.com/apps](https://developers.facebook.com/apps) and add the
   **Marketing API** product.
2. Set in `.env`:
   ```
   META_APP_ID=...
   META_APP_SECRET=...
   META_REDIRECT_URI=https://yourdomain.com/api/meta/oauth/callback
   ```
3. Restart the app. The **Connect with Meta** button on each client's Account page becomes active.
4. Once connected, `lib/data/*.service.ts` automatically prefers live Graph API data over demo data
   for that client — no code changes required. Tokens are AES-256-GCM encrypted at rest
   (`lib/security/crypto.ts`) and never sent to the browser.

## Notes

- **Multi-tenant isolation**: every server-side query goes through `lib/data/scope.ts`, which resolves
  the signed-in user's organization and asserts any requested Client belongs to it.
- **Demo vs. Live**: `InsightSnapshot.source` tags every row `DEMO` or `LIVE`; the topbar shows a
  matching badge so it's never ambiguous which the client is looking at.
- Repo sits under a OneDrive-synced folder — if `npm run build`/`dev` ever fails with `EPERM` on
  `.next`, that's OneDrive locking files mid-sync; delete `.next` and retry, or exclude the project
  folder from OneDrive sync entirely for smoother local dev.
