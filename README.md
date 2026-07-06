# SocialPilot

A full-stack social media publishing and scheduling dashboard. Connect Instagram,
Facebook, TikTok, LinkedIn, X/Twitter and YouTube Shorts, upload and schedule
posts, publish automatically, and track performance and comments — all from
one dashboard.

Built with Next.js (App Router) + TypeScript, Tailwind CSS, Prisma, and
PostgreSQL. Vercel-ready, including a Vercel Cron endpoint for scheduled
publishing.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4**
- **Prisma** ORM + **PostgreSQL** (works with a local Postgres instance or
  a hosted Supabase Postgres database — same schema either way)
- Custom email/password auth (bcrypt + signed JWT session cookie, no
  third-party auth service required)
- `services/social/*` — one file per platform, each a thin wrapper around
  that platform's real REST API

## Project structure

```
prisma/schema.prisma          Database schema (see "Database" below)
prisma/migrations/            SQL migrations

src/app/
  (login|register)/           Auth pages
  dashboard/
    posts/                     Posts & Scheduler
    settings/                  Settings & Connections
    calendar/                  Calendar & Growth
    comments/                  Comments & Audience
  api/
    auth/...                   Register / login / logout
    posts/...                  Create / list / edit / delete / publish posts
    media/...                  Upload / delete media
    social/...                 Connect / disconnect / OAuth callback per platform
    settings/...                Default caption/hashtags, theme
    analytics/...              Monthly summary + manual refresh
    calendar/...               Per-day calendar data
    comments/...               List / refresh / reply
    cron/publish-scheduled/    Vercel Cron target

src/services/
  social/
    instagram.ts, facebook.ts, tiktok.ts, linkedin.ts, twitter.ts, youtube.ts
    index.ts                   Platform registry + token decryption
    types.ts                   Shared SocialService interface
  publish.ts                   Publishes a post to every selected platform
  analytics.ts                 Pulls fresh metrics for published posts
  comments.ts                  Pulls new comments for published posts

src/lib/
  prisma.ts, auth.ts, session.ts, crypto.ts, storage.ts, validation.ts,
  post-compose.ts, platforms.ts, api-utils.ts

src/components/                UI primitives + feature components
src/proxy.ts                   Route protection (Next.js "proxy", formerly middleware)
```

## Database

All the requested entities are modeled in `prisma/schema.prisma`:
`User`, `Session`, `UserSettings` (theme + default caption/hashtags),
`SocialAccount`, `Post`, `PostPlatform` (per-platform publish status),
`Media`, `PublishLog` (append-only publish history), `Comment`,
`CommentReply`, `Analytics` (daily per-post-per-platform snapshots).

A baseline migration already exists at
`prisma/migrations/20260706000000_init/migration.sql` (generated offline
with `prisma migrate diff`, since no live database was available in the
build environment — it has not been applied or tested against a running
Postgres yet).

## Setup

> This repo's `.env` already points at a live Supabase project with the
> schema applied, so `npm install && npm run dev` works immediately for
> local testing. The steps below are for setting up your **own** database
> (e.g. before deploying, or if you want a clean slate).

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Get a PostgreSQL database.** Either:
   - Local Postgres: install Postgres, create a database, and use its
     connection string, or
   - [Supabase](https://supabase.com): create a free project and copy the
     connection string from Project Settings → Database (use the "Session
     pooler" URI for serverless/Vercel deployments).

3. **Copy the env file and fill it in**

   ```bash
   cp .env.example .env
   ```

   At minimum, set `DATABASE_URL`, `AUTH_SECRET`, and `ENCRYPTION_KEY`
   (generate both secrets with `openssl rand -hex 32`). Leave the platform
   API blocks blank for now — see "Connecting real social APIs" below.

4. **Apply the database schema**

   ```bash
   npx prisma migrate deploy   # applies the existing migration
   npx prisma generate         # regenerates the client (also runs on `npm install` via postinstall — add one if you don't already have it)
   ```

   If you'd rather have Prisma (re)create the migration from the current
   schema against your database, use `npx prisma migrate dev` instead.

5. **Run the app**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`, create an account, and you're in.

## Connecting real social APIs later

Every platform integration lives in `src/services/social/<platform>.ts` and
follows the same shape: `isConfigured()`, `getAuthUrl()`,
`exchangeCodeForToken()`, `publishPost()`, `getAnalytics()`,
`getComments()`, `replyToComment()`. Until a platform's env vars are set,
`isConfigured()` returns `false`, the Settings page shows "Not configured"
instead of a Connect button, and any publish attempt to that platform fails
with a clear error — nothing is faked.

To turn one on:

1. Register a developer app with the platform (links below).
2. Set its redirect URI to `https://<your-domain>/api/social/callback/<platform>`
   (already set to the `localhost:3000` equivalent in `.env.example` for
   local dev).
3. Add the resulting client id/secret to `.env` (see the exact variable
   names in `.env.example`).
4. Restart the app, go to **Settings & Connections**, and click **Connect**.

| Platform | Developer portal | Env vars |
|---|---|---|
| Instagram | developers.facebook.com/apps (Instagram Graph API via Facebook Login for Business) | `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_REDIRECT_URI` |
| Facebook | developers.facebook.com/apps | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_REDIRECT_URI` |
| TikTok | developers.tiktok.com/apps | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI` |
| LinkedIn | linkedin.com/developers/apps | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` |
| X / Twitter | developer.x.com/en/portal/dashboard | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`, `TWITTER_REDIRECT_URI` |
| YouTube Shorts | console.cloud.google.com/apis/credentials | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI` |

Notes on the current implementations (each file has more detail in code
comments):

- **Media must be publicly reachable over HTTPS** for most platforms to
  fetch it (Instagram, TikTok, Facebook video/photo all pull from a URL).
  The built-in local disk storage (`src/lib/storage.ts`) only works for
  this once the app itself is deployed somewhere public — on `localhost`
  platforms can't reach your files. Swap in S3 / Supabase Storage /
  Cloudinary for production (the function signatures are already isolated
  in `storage.ts` so this is a one-file change).
- **TikTok comments/replies** require an approved business API scope not
  available to standard apps yet — `getComments`/`replyToComment` return a
  clear "not yet available" result until that's granted.
- **X/Twitter** uses OAuth2 with PKCE; the connect route generates the
  code verifier/challenge and stores the verifier in a short-lived
  `httpOnly` cookie between the redirect and the callback.
- Facebook/Instagram token exchange returns a short-lived user token; the
  code has TODOs marking where to add the long-lived Page token exchange
  and Page/IG-business-account id lookup once you're testing against a
  real app.

## Scheduling

`src/services/publish.ts` exports `publishDuePosts()`, which finds every
post with `status = SCHEDULED` and `scheduledAt <= now` and publishes it.

- **Vercel**: `vercel.json` already defines a cron job hitting
  `GET /api/cron/publish-scheduled` every 5 minutes. Set `CRON_SECRET` in
  your Vercel project's env vars — Vercel automatically sends it as
  `Authorization: Bearer <CRON_SECRET>`, which the route verifies.
- **Local dev / other hosts**: call the same endpoint from any scheduler
  (cron, GitHub Actions, uptime pinger) with that same header, e.g.:
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/publish-scheduled
  ```

## Security

- Passwords are hashed with bcrypt; sessions are signed JWTs in an
  `httpOnly`, `sameSite=lax` cookie — never readable from client JS.
- OAuth access/refresh tokens are encrypted at rest with AES-256-GCM
  (`src/lib/crypto.ts`, key from `ENCRYPTION_KEY`) and are only ever
  decrypted server-side inside `services/social/index.ts`; API responses
  never include raw tokens.
- Every API route re-derives the user from the session cookie and scopes
  all Prisma queries to that `userId` — posts, media, accounts, comments,
  and analytics are only ever read or written for their owner.
- `src/proxy.ts` (Next's route-protection convention, formerly
  "middleware") redirects unauthenticated requests away from `/dashboard/*`.
- All request bodies are validated with Zod (`src/lib/validation.ts`)
  before touching the database.

## Verified end-to-end

This app is now connected to a live Supabase Postgres project and has been
smoke-tested for real in a browser:

- Migration applied, RLS enabled on all 11 tables (`ALTER TABLE ... ENABLE
  ROW LEVEL SECURITY`, no policies — safe with Prisma's direct connection,
  which uses the `postgres` role and bypasses RLS; it only blocks the
  anon/authenticated PostgREST access this app doesn't use).
- Registered a real account, logged in, created a post, and hit "Publish
  now" with no platform connected — it correctly failed with *"No
  connected TWITTER account. Connect one in Settings & Connections."*
  instead of faking success, and the Retry/Edit/Delete actions all worked.
- Settings, Calendar & Growth, and Comments & Audience pages all render
  correctly against the live (empty) database with proper empty states.
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` all pass with
  zero errors.

Along the way this caught and fixed one real bug: `ToastProvider` and
`Dialog` branched their render output on `typeof document !== "undefined"`,
which differs between the server render and the first client render and
caused a hydration-mismatch crash. Both now use a `mounted` state flag set
in `useEffect` instead — the standard fix for portal-based components in
SSR apps.

## Known limitations

- No real platform credentials were available to test live publishing,
  analytics, or comment syncing against actual Instagram/Facebook/TikTok/
  LinkedIn/X/YouTube accounts — those code paths call the real REST APIs
  (see `src/services/social/*.ts`) but are unverified against live accounts.
  Once you add real API credentials per the table above, test each
  platform's connect → publish → analytics → comments flow for real.
