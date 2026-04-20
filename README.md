# QR Tracker

Private internal QR tracking app. Create QR codes, organize them in folders, serve redirects through `/r/[slug]`, log every scan, view stats on a dashboard, bulk-download QR PNG/SVG files, and receive weekly/monthly email reports.

- Next.js App Router + TypeScript + Tailwind
- Supabase (Postgres + Auth) with RLS
- Resend for report emails
- `qrcode` for PNG generation, `ua-parser-js` for scan metadata, `zod` for validation

---

## 1. Install

```bash
npm install
```

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in values:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
REPORT_FROM_EMAIL=reports@yourdomain.com   # must be a verified Resend sender
REPORT_TO_EMAIL=you@yourdomain.com
CRON_SECRET=some-long-random-string
```

`SUPABASE_SERVICE_ROLE_KEY` is used only by the `/r/[slug]` route (to log scans anonymously, bypassing RLS) and by the report builder. Never expose it to the browser.

## 3. Supabase setup

1. Create a new Supabase project.
2. Open **SQL Editor** and run the contents of [`supabase/schema.sql`](./supabase/schema.sql). It creates `qr_folders`, `qr_codes`, `qr_scans`, `report_preferences`, indexes, and RLS policies.
3. In **Authentication -> Users**, click **Add user** and create the single admin user with email + password. (Email confirmation can be skipped in dev.)
4. (Optional) In **Authentication -> Providers -> Email**, disable signups so no one else can register.

## 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000 - you'll be redirected to `/login`. Sign in with the admin credentials you created in Supabase.

## 5. Typecheck / build

```bash
npm run typecheck
npm run build
```

## 6. Deploy to Vercel

1. Push this folder to a git repo and import it into Vercel.
2. Set **Project -> Settings -> Environment Variables** using the same keys as `.env.local`. Set `NEXT_PUBLIC_SITE_URL` to your deployed URL (e.g. `https://qr.example.com`).
3. In Resend, verify the sender domain for `REPORT_FROM_EMAIL`.
4. Deploy.

`vercel.json` already registers two cron jobs:

```
/api/reports/weekly   - every Monday 14:00 UTC
/api/reports/monthly  - 1st of each month 14:00 UTC
```

Report endpoints accept:
- `Authorization: Bearer $CRON_SECRET` for Vercel Cron or external schedulers
- An authenticated admin session via the dashboard "Send report now" buttons

Adjust the schedules in `vercel.json` as desired.

## 7. Using the app

- **Dashboard** (`/dashboard`): totals, folder filters, selectable QR table, bulk PNG/SVG downloads with color controls, and manual report triggers.
- **New QR** (`/qr/new`): name, destination URL, optional folder/slug/campaign/notes, active toggle.
- **QR detail** (`/qr/[id]`): preview + PNG/SVG download with color controls, folder, redirect URL, total/last scan, recent 50 scans. Edit + delete.
- **Redirect** (`/r/[slug]`): logs a scan row, then 302s to the destination. Returns a clean error page if disabled or missing.

---

## File map

```
app/
  layout.tsx                     root HTML shell
  page.tsx                       redirects to /dashboard or /login
  globals.css                    Tailwind base + small overrides
  login/page.tsx                 client-side Supabase sign-in
  auth/signout/route.ts          POST -> Supabase signOut
  (app)/                         protected shell (TopNav + auth check)
    layout.tsx
    dashboard/page.tsx           stats + dashboard data fetching
    qr/new/page.tsx              create QR
    qr/[id]/page.tsx             detail (preview, stats, recent scans)
    qr/[id]/edit/page.tsx        edit QR
  api/
    qr/route.ts                  POST create QR
    qr/[id]/route.ts             PATCH / DELETE QR
    reports/weekly/route.ts      build + email weekly report
    reports/monthly/route.ts     build + email monthly report
  r/[slug]/route.ts              public redirect + scan logger
components/
  ui.tsx                         Button, Input, Card, Stat, Badge, Field
  nav.tsx                        top nav + sign-out
  qr-table.tsx                   folder filter + select/download table
  qr-download.ts                 PNG/SVG generation + download helpers
  qr-form.tsx                    shared create/edit form (client)
  qr-preview.tsx                 renders and downloads QR PNG (client)
  report-triggers.tsx            dashboard "send report now" buttons (client)
lib/
  env.ts                         typed env accessor
  folders.ts                     folder normalization + find-or-create helper
  schemas.ts                     zod schemas + URL normalization
  slug.ts                        slugify + random slug
  user-agent.ts                  ua-parser wrapper
  format.ts                      date/relative helpers
  report.ts                      report aggregation + HTML email template
  report-delivery.ts             shared report auth + Resend delivery
  resend.ts                      lazy Resend client
  supabase/
    client.ts                    browser client
    server.ts                    cookie-bound server client + service-role client
    middleware.ts                session refresh + route guard
middleware.ts                    wires the Supabase middleware
supabase/schema.sql              tables, indexes, RLS policies
types/db.ts                      row types
vercel.json                      cron schedules
```

---

## Env vars (reference)

| Key | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Used to build `/r/[slug]` URLs shown in the UI/QR images. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (browser + cookie-bound server). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; used by `/r/[slug]` and report builder. |
| `RESEND_API_KEY` | Resend API key. |
| `REPORT_FROM_EMAIL` | Verified sender for reports. |
| `REPORT_TO_EMAIL` | Admin inbox to receive reports. |
| `CRON_SECRET` | Shared secret to authorize external cron triggers. |

---

## SQL to run

See [`supabase/schema.sql`](./supabase/schema.sql). Paste into the Supabase SQL editor and run once. Safe to re-run (all statements are idempotent).

## Exact local commands

```bash
npm install
cp .env.example .env.local     # then fill in the values
npm run dev
# visit http://localhost:3000
```

## Manual report trigger (smoke test)

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/reports/weekly
```

Or hit the dashboard **Send weekly** / **Send monthly** buttons while signed in.

---

## Known v1 limitations

- **Single admin.** No team, no invites, no role management. Anyone with a Supabase row in `auth.users` can log in, so keep signups disabled.
- **No custom branding of the QR image.** Black/white PNG with 1-module margin.
- **Geo is best-effort.** Uses `x-vercel-ip-country` / `x-vercel-ip-city` on Vercel; falsy elsewhere. No GeoIP library.
- **No bot filtering.** Every hit to `/r/[slug]` that resolves to an active code is logged as a scan, including previews/link-checkers.
- **Dashboard scan aggregation is still intentionally simple.** It paginates scan rows server-side for correctness, but a very high-volume install should move per-code aggregation into a SQL view or RPC.
- **Reports use completed UTC periods.** Weekly reports cover the previous 7 UTC days; monthly reports cover the previous calendar month.
- **No charts.** Strong tables + stat cards only, per the MVP brief.
- **Destination URL is stored verbatim** (minus http(s):// normalization); no safety scanning against phishing lists etc.
