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

| Script                               | What it does                             |
| ------------------------------------ | ---------------------------------------- |
| `npm run dev`                        | Dev server                               |
| `npm run build`                      | Production build                         |
| `npm run lint`                       | ESLint                                   |
| `npm run format`                     | Prettier (writes)                        |
| `npm run format:check`               | Prettier (checks only)                   |
| `npm run db:migrate`                 | Create and apply a Prisma migration      |
| `npm run db:studio`                  | Browse the database in Prisma Studio     |
| `npm run crawl -- URL`               | Crawl a store into `snapshot.json`       |
| `npm run audit:dry -- snapshot.json` | Score a snapshot and print failed checks |
| `npm test`                           | Run the Vitest suite                     |

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
  (`lib/scoring/fixes.js`). The roadmap puts impact 4+ and effort 1–2 in
  0–30 days, impact 3+ and effort 3–4 in 30–60 days, and everything else in
  60–90 days.
- Performance (PageSpeed) checks are reported as context and never scored.
