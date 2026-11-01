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

| Script                 | What it does                         |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Dev server                           |
| `npm run build`        | Production build                     |
| `npm run lint`         | ESLint                               |
| `npm run format`       | Prettier (writes)                    |
| `npm run format:check` | Prettier (checks only)               |
| `npm run db:migrate`   | Create and apply a Prisma migration  |
| `npm run db:studio`    | Browse the database in Prisma Studio |
| `npm run crawl -- URL` | Crawl a store into `snapshot.json`   |

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
