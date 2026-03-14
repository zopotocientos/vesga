# Keyword Monitor

A daily web monitoring app that scans a list of websites for individual names (keywords) and sends an email report when matches are found.

Built with **Next.js** · **Supabase** · **Vercel** · **GitHub Actions**

---

## Features

- **Admin dashboard** — manage keywords and websites via a clean web UI
- **Daily automated scans** — triggered by GitHub Actions every morning
- **Manual scan** — run a scan on demand from the dashboard
- **Smart deduplication** — email only highlights *new* matches, not ones already seen
- **Scan history** — full log of every run with status, duration, and match counts
- **Provider-agnostic email** — plug in Resend, SendGrid, or any SMTP

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-org/keyword-monitor
cd keyword-monitor
npm install
```

### 2. Create the Supabase tables

1. Open your Supabase project → **SQL Editor**
2. Paste and run the contents of `supabase/migrations/001_initial.sql`

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with your values:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `SCAN_SECRET` | Generate: `openssl rand -hex 32` |
| `REPORT_EMAIL_TO` | Your email address |
| `REPORT_EMAIL_FROM` | Verified sender address |

### 4. Configure email

Open `lib/email.ts` and uncomment **one** provider block. Install its package:

- **Resend** (recommended): `npm install resend` → add `RESEND_API_KEY`
- **SendGrid**: `npm install @sendgrid/mail` → add `SENDGRID_API_KEY`
- **SMTP**: `npm install nodemailer @types/nodemailer` → add `SMTP_HOST/PORT/USER/PASS`

### 5. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

### 6. Deploy to Vercel

```bash
npx vercel --prod
```

Or connect your GitHub repo in the Vercel dashboard for automatic deploys.

Add all environment variables from `.env.local` in **Vercel → Settings → Environment Variables**.

### 7. Set up GitHub Actions

In your GitHub repo → **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|---|---|
| `APP_URL` | Your Vercel deployment URL (e.g. `https://keyword-monitor.vercel.app`) |
| `SCAN_SECRET` | Same value as your `SCAN_SECRET` env var |

The workflow in `.github/workflows/daily-scan.yml` runs at **7:00 AM UTC** by default.  
Change the cron schedule to match your preferred timezone.

---

## Project structure

```
├── app/
│   ├── page.tsx              # Dashboard
│   ├── keywords/page.tsx     # Manage keywords
│   ├── websites/page.tsx     # Manage websites
│   ├── results/page.tsx      # View all matches
│   └── api/
│       ├── keywords/         # GET, POST, DELETE
│       ├── websites/         # GET, POST, DELETE
│       ├── scan/             # POST — trigger a scan
│       └── results/          # GET — results + run history
├── lib/
│   ├── supabase.ts           # DB client and types
│   ├── scraper.ts            # Page fetcher (axios + cheerio)
│   ├── matcher.ts            # Keyword search logic
│   └── email.ts              # Email reporter (plug in your provider)
├── .github/workflows/
│   └── daily-scan.yml        # Daily cron trigger
└── supabase/migrations/
    └── 001_initial.sql       # Database schema
```

---

## Handling JavaScript-rendered sites

By default the scraper uses `axios` + `cheerio`, which works for static HTML.  
For SPAs or sites that require JavaScript to render content:

1. Sign up at [ScrapingBee](https://scrapingbee.com) (free tier available)
2. Add `SCRAPINGBEE_API_KEY` to your env vars
3. In `lib/scraper.ts`, uncomment the ScrapingBee block and replace the axios call

---

## Vercel plan notes

- **Hobby plan**: API function timeout is **10 seconds** — suitable for ~5–10 websites
- **Pro plan**: Timeout extends to **60 seconds** — suitable for 20–30 websites
- For larger lists, consider splitting sites into batches using Supabase Edge Functions

---

## Adding name variants

People can appear in different formats on different sites. Add each variant as a separate keyword:

- `John Smith`
- `J. Smith`  
- `Smith, John`
- `Dr. John Smith`
