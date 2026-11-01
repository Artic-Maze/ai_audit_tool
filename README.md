# GrowthLens

Enter a Shopify store URL and get a scored audit of AI opportunities across
product copy, search, support, recommendations and email/retention.

Built with Next.js 15 (App Router, JavaScript), Tailwind + shadcn/ui, Prisma 7
on Postgres, and zod.

## Setup

Requires Node 20+ and a local Postgres.

```bash
npm install                # also runs `prisma generate`
cp .env.example .env       # then fill in the API keys
npm run db:migrate         # creates the database and tables
npm run dev                # http://localhost:3000
```

## Scripts

| Script                               | What it does                                   |
| ------------------------------------ | ---------------------------------------------- |
| `npm run dev`                        | Dev server                                     |
| `npm run build`                      | Production build                               |
| `npm run lint`                       | ESLint                                         |
| `npm run format`                     | Prettier (writes)                              |
| `npm run format:check`               | Prettier (checks only)                         |
| `npm run db:migrate`                 | Create and apply a Prisma migration            |
| `npm run db:studio`                  | Browse the database in Prisma Studio           |
| `npm run crawl -- URL`               | Crawl a store into `snapshot.json`             |
| `npm run audit:dry -- snapshot.json` | Score a snapshot and print failed checks       |
| `npm run audit -- URL`               | Full audit with Claude, saved to `report.json` |
| `npm test`                           | Run the Vitest suite                           |

### Crawler

```bash
npm run crawl -- colourpop.com                  # writes snapshot.json
npm run crawl -- colourpop.com --out cp.json    # custom output path
npm run crawl -- rothys.com --no-products-json  # force the sitemap fallback
npm run crawl -- rothys.com --no-pagespeed      # skip the slow PageSpeed runs
```

The crawler only reads public storefront data, sends at most 3 requests at a
time, and identifies itself as `GrowthLensBot`. Stores behind bot
protection (Cloudflare challenges) are reported as blocked rather than
crawled. PageSpeed works without `PAGESPEED_API_KEY` but has a low shared
quota; set a key for regular use.

### Checks and scoring

`npm run audit:dry -- snapshot.json` runs every check against a crawled
snapshot and prints the scores, failed checks with their evidence, and a
roadmap preview (`--json` prints the raw results instead). Everything here is
plain code with no LLM, so the same snapshot always gets the same scores.

- Checks live in `lib/checks/`, one file per area. Each returns
  `{ id, area, passed, metric, value, evidence[] }`, where `passed` is `null`
  when the data it needs couldn't be collected. That never counts as a pass or
  a failure.
- Each area starts at 100 and loses the weight of every failed check
  (`lib/scoring/weights.js`). Unmeasured checks are left out and the rest
  scaled back to 100; an area measured on less than half its weight gets no
  score. The overall score is the weighted average of the scored areas.
- Grades: 80+ Good, 60–79 Needs work, under 60 Big opportunity.
- Each failed check maps to an AI fix with a fixed impact and effort
  (`lib/scoring/fixes.js`). The roadmap puts impact 3+ and effort 1–2 in
  0–30 days, impact 3+ and effort 3–4 in 30–60 days, and everything else in
  60–90 days.
- Performance (PageSpeed) checks are reported as context and never scored.

### Report writing (Claude)

`npm run audit -- colourpop.com` runs the whole pipeline: crawl, checks and
scores, then three Claude calls (`claude-sonnet-5-5`) that write the
opportunity explanations, before/after rewrites of the two thinnest product
descriptions, and an executive summary. The validated `AuditReport` is saved
to `report.json`. Pass a snapshot instead of a URL to skip the crawl:
`npm run audit -- snapshot.json`.

- Code decides everything that's scored: which opportunities exist (one per
  AI fix with a failed check), their impact and effort, their order (impact,
  then effort) and roadmap phase. Claude only writes the prose around them.
- Answers use structured outputs and are re-checked with zod plus extra rules:
  every opportunity covered, lift given as a range, and no number that isn't
  in the facts Claude was given. A rejected answer is retried once with the
  problems listed; if it fails again, the report falls back to text built from
  the checks, so it never breaks.
- Requests opt into server-side refusal fallback (`fallbacks: "default"`).
- Needs `ANTHROPIC_API_KEY`; `ANTHROPIC_MODEL` overrides the model.

### Audit jobs and API

Run `npm run dev` and submit a store on the landing page. The page posts to
the API, which starts the audit in the background, and `/audit/[id]` polls for
progress until the report is ready.

| Endpoint              | What it does                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `POST /api/audit`     | Body `{"url": "store.com"}`. Starts an audit (202) or returns a reusable one (200) as `{ id, status, reused }`. |
| `GET /api/audit/[id]` | Status, stage, progress and message; the report once `status` is `done`. The crawl snapshot stays server-side.  |
| `POST /api/lead`      | Body `{"auditId": "…", "email": "…"}`. Saves the lead and unlocks the full report for that browser.             |

- Audits run in the app process, up to 3 at a time (the rest wait as
  `queued`), and write their stage to the `Audit` row as they go.
- A finished audit of the same store is reused for 24 hours, and so is one
  that's still running. `www.` and bare domains count as the same store.
- Audits interrupted by a restart or deploy are marked failed when the next
  process starts, and any audit with no progress for 15 minutes is marked
  failed when polled. This assumes a single app instance.

### Report page and email gating

`/audit/[id]` shows the progress steps, then the report: header with the
overall score, executive summary, area scores, an impact vs. effort chart,
opportunity cards, before/after product copy, a 90-day roadmap, page speed,
and methodology and limitations.

- Before the viewer gives their email, the page and the API include only the
  header, the area scores and the top 3 opportunities. Locked sections are
  placeholders; their content isn't sent to the browser at all.
- Submitting the form calls `POST /api/lead`, which saves the lead and sets a
  signed, HTTP-only cookie that unlocks that audit in that browser.
- `UNLOCK_SECRET` signs the cookie (required in production). `BOOKING_URL`
  sets the "Book a call" link at the end of the report; without it the
  section is hidden.
