# GrowthLens

**An open-source AI growth audit for Shopify stores.** Enter a store's URL and
get a scored report on where AI could grow it: product copy, search, support,
product recommendations, and email.

GrowthLens reads the store's public storefront, runs 20 rule-based checks, and
scores five areas out of 100. It then turns the failed checks into
prioritized opportunities with a 90-day roadmap. Claude writes the
explanations, rewrites two product descriptions, and summarizes the audit.

The scores are plain code. The language model never decides a number, so
the same store data always gets the same scores, and every figure in a report
can be traced back to a check.

## Contents

- [What a report contains](#what-a-report-contains)
- [How it works](#how-it-works)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Command-line tools](#command-line-tools)
- [How stores are scored](#how-stores-are-scored)
- [The AI layer](#the-ai-layer)
- [HTTP API](#http-api)
- [The crawler](#the-crawler)
- [Data and privacy](#data-and-privacy)
- [Project structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

## What a report contains

- **Scores**: an overall score and a score for each of five areas (product
  copy, search, support, recommendations, email and retention), each graded
  Good (80+), Needs work (60–79) or Big opportunity (under 60).
- **Opportunities**: up to 10 AI fixes, highest impact first. Each comes with
  what we found (citing the evidence), what to build, impact and effort
  ratings, an estimated lift range, and the checks it's based on.
- **Impact vs. effort chart**: every opportunity on one chart, with quick
  wins highlighted.
- **Before and after**: the two thinnest product descriptions, rewritten
  in the store's voice. Details the data doesn't contain are left as
  `[placeholders]` for the merchant to fill in.
- **90-day roadmap**: opportunities sorted into 0–30, 30–60 and 60–90 days.
- **Page speed**: Lighthouse scores and Core Web Vitals for the homepage and
  a product page, on mobile and desktop.
- **Methodology and limitations**: what the audit could and couldn't see,
  plus the result of every check.

Anyone with a report's link can see the whole report. There's no sign-up or
email step.

## How it works

```mermaid
flowchart LR
  A[Store URL] --> B[Detect Shopify]
  B --> C[Crawl the public storefront]
  C --> D[20 rule-based checks]
  D --> E[Area and overall scores]
  D --> F[Opportunities with impact and effort]
  F --> G[Claude writes findings, copy and summary]
  F --> H[90-day roadmap]
  E & G & H --> I[AuditReport]
  I --> J[(PostgreSQL)]
  J --> K[Report page]
```

1. **Detect.** The URL is normalized (`yourstore.com` becomes
   `https://yourstore.com`), redirects are followed, and the site is
   confirmed as Shopify from its response headers, its `Shopify.theme`
   global, its CDN assets or `/products.json`.
2. **Crawl.** About 50 requests to public endpoints: the product catalog,
   collections, the homepage, five product pages, the FAQ and contact
   pages, a few search queries, and four PageSpeed runs. See
   [The crawler](#the-crawler).
3. **Check.** 16 scored checks and 4 performance checks run against the
   crawled snapshot. A check whose data couldn't be collected is marked "not
   measured" rather than passed or failed.
4. **Score.** Each area starts at 100 and loses the weight of every failed
   check. See [How stores are scored](#how-stores-are-scored).
5. **Plan.** Failed checks are grouped into AI fixes, each with a fixed
   impact and effort rating, which also decides its roadmap phase.
6. **Write.** Three Claude calls run in parallel to write the opportunity
   write-ups, the copy rewrites and the summary. Every answer is validated,
   and if one fails, the report falls back to text built from the checks.
7. **Report.** The result is validated against the `AuditReport` schema,
   saved in Postgres, and reused for 24 hours for the same store.

A typical audit takes 30 seconds to two minutes. Page speed is the slowest
step; the Claude calls take about 8 seconds.

## Quick start

You need:

- **Node.js 22.12 or newer** (24 recommended)
- **PostgreSQL** (developed against 15)
- An **Anthropic API key** for the AI-written parts. Without one, reports
  still work, using text built from the checks.
- Optionally, a **Google PageSpeed Insights API key**. It works without one,
  but the shared quota runs out quickly.

```bash
git clone https://github.com/Artic-Maze/ai_audit_tool.git
cd ai_audit_tool
npm install            # also generates the Prisma client
cp .env.example .env   # then fill in the values below
npm run db:migrate     # creates the database and tables
npm run dev            # http://localhost:3000
```

Open <http://localhost:3000>, enter a store address, and the audit starts.
The page shows each step as it runs, then the report.

## Configuration

All settings are environment variables, read from `.env` in development.

| Variable            | Required    | What it does                                                                                             |
| ------------------- | ----------- | -------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | Yes         | Postgres connection string. `npm run db:migrate` creates the database if it doesn't exist.               |
| `ANTHROPIC_API_KEY` | Recommended | Claude API key for the opportunity write-ups, copy rewrites and summary.                                 |
| `ANTHROPIC_MODEL`   | No          | Overrides the model. Defaults to `claude-sonnet-5-5`.                                                    |
| `PAGESPEED_API_KEY` | Recommended | Google PageSpeed Insights API key. Keyless requests share a small quota.                                 |
| `APP_URL`           | Recommended | Your deployment's public URL. Added to the crawler's User-Agent so store owners can see who is visiting. |
| `BOOKING_URL`       | No          | Link for the "Book a call" section at the end of each report. The section is hidden when this isn't set. |

## Command-line tools

Each stage of the pipeline can be run from the terminal, which is handy for
trying changes without the web app.

```bash
# Crawl a store and save the snapshot (snapshot.json by default)
npm run crawl -- colourpop.com
npm run crawl -- colourpop.com --out cp.json --no-pagespeed
npm run crawl -- rothys.com --no-products-json   # force the sitemap fallback

# Score a saved snapshot: area scores, failed checks with evidence, roadmap
npm run audit:dry -- snapshot.json
npm run audit:dry -- snapshot.json --json        # raw results

# The full audit with Claude, from a URL or a saved snapshot
npm run audit -- colourpop.com                   # writes report.json
npm run audit -- snapshot.json --out report.json
```

## How stores are scored

All of this is code (`lib/checks/` and `lib/scoring/`), with no language
model involved.

### Checks

| Area              | Check                                                                 | Passes when                                                                                        | Weight       |
| ----------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------ |
| Product copy      | Thin product descriptions (`copy.thin-descriptions`)                  | 20% or fewer products have descriptions under 50 words                                             | 30           |
| Product copy      | Duplicate product descriptions (`copy.duplicate-descriptions`)        | 10% or fewer described products share their description with another                               | 20           |
| Product copy      | Missing image alt text (`copy.image-alt-text`)                        | 10% or fewer product images lack alt text (from a sample of 30 products)                           | 20           |
| Product copy      | Weak SEO titles or meta descriptions (`copy.seo-meta`)                | 20% or fewer sampled product pages have a title under 20 or a meta description under 50 characters | 15           |
| Product copy      | Product structured data (`copy.structured-data`)                      | 80% or more sampled product pages have Product JSON-LD                                             | 15           |
| Search            | Typo tolerance (`search.typo-tolerance`)                              | A misspelled word from the catalog returns at least one result                                     | 40           |
| Search            | Synonyms and plurals (`search.synonyms`)                              | A synonym or plural of a catalog word returns at least one result                                  | 35           |
| Search            | Search app (`search.app`)                                             | A search app is detected                                                                           | 25           |
| Support           | Chat widget (`support.chat`)                                          | A live chat or chatbot widget is detected                                                          | 50           |
| Support           | FAQ page (`support.faq-page`)                                         | An FAQ page is linked from the homepage or exists at `/pages/faq`                                  | 30           |
| Support           | Contact page (`support.contact-page`)                                 | A contact page is linked from the homepage or exists at `/pages/contact`                           | 20           |
| Recommendations   | Recommendations app (`recommendations.app`)                           | A recommendations or upsell app is detected                                                        | 50           |
| Recommendations   | Related products on product pages (`recommendations.related-section`) | 50% or more sampled product pages have a related-products section                                  | 50           |
| Email & retention | Email or SMS app (`email.app`)                                        | An email or SMS marketing app is detected                                                          | 50           |
| Email & retention | Newsletter signup form (`email.signup-form`)                          | The homepage has a newsletter signup form                                                          | 25           |
| Email & retention | Signup popup (`email.popup`)                                          | A popup app is detected                                                                            | 25           |
| Performance       | Mobile performance score (`performance.mobile-score`)                 | Lighthouse mobile score of 50 or more                                                              | Context only |
| Performance       | Largest Contentful Paint (`performance.lcp`)                          | LCP of 2.5 s or less on mobile                                                                     | Context only |
| Performance       | Cumulative Layout Shift (`performance.cls`)                           | CLS of 0.1 or less on mobile                                                                       | Context only |
| Performance       | Interaction to Next Paint (`performance.inp`)                         | INP of 200 ms or less (real-user data only)                                                        | Context only |

A check is **not measured** when it can't be judged honestly. For example:

- the store's bot protection blocked a request;
- a headless storefront exposes no product data;
- search results are rendered by a search app's JavaScript;
- an email app could be adding a signup form with JavaScript that the HTML
  doesn't show.

### Area scores and grades

- Each area starts at 100 and loses the weight of every failed check. Each
  area's weights add up to 100.
- Checks that weren't measured are left out, and the measured ones are
  scaled back to 100. An area measured on less than half its weight shows
  "Not enough data" instead of a score.
- The overall score is the weighted average of the scored areas: product copy
  25, search 20, support 15, recommendations 20, email and retention 20. It
  needs at least half that weight scored.
- Grades: **Good** 80+, **Needs work** 60–79, **Big opportunity** under 60.
- Performance checks are shown for context and never affect a score.

### Opportunities and roadmap

Failed checks are grouped into AI fixes. Each check carries an impact and
effort rating from 1 to 5, and a fix takes the highest of its failed checks'
ratings.

| Fix                                            | Area              | Triggered by (impact / effort)                                     |
| ---------------------------------------------- | ----------------- | ------------------------------------------------------------------ |
| Improve product descriptions with AI           | Product copy      | Thin descriptions (4/2), duplicate descriptions (3/2)              |
| Generate image alt text with AI                | Product copy      | Missing alt text (2/1)                                             |
| Write SEO titles and meta descriptions with AI | Product copy      | Weak SEO titles or meta descriptions (3/1)                         |
| Add Product structured data to the theme       | Product copy      | Product structured data (3/2)                                      |
| Add AI-powered site search                     | Search            | Typo tolerance (4/3), synonyms and plurals (4/3), search app (3/3) |
| Add an AI support chat                         | Support           | Chat widget (4/3)                                                  |
| Publish an FAQ page drafted with AI            | Support           | FAQ page (3/1)                                                     |
| Add a contact page                             | Support           | Contact page (2/1)                                                 |
| Add AI product recommendations                 | Recommendations   | Recommendations app (4/2), related products (3/2)                  |
| Set up AI-personalized email and SMS flows     | Email & retention | Email or SMS app (5/3)                                             |
| Capture more email signups                     | Email & retention | Newsletter signup form (3/1), signup popup (3/1)                   |

Opportunities are ordered by impact, then effort, and capped at 10. The
roadmap puts each one in a phase:

| Phase      | Rule                           |
| ---------- | ------------------------------ |
| 0–30 days  | Impact 3+ and effort 2 or less |
| 30–60 days | Impact 3+ and effort 3–4       |
| 60–90 days | Everything else                |

## The AI layer

Claude (`claude-sonnet-5-5` by default) writes three things, in three calls
that run in parallel (`lib/llm/`):

1. **Opportunity write-ups**: a title, what we found, what to build, and an
   estimated lift range for each opportunity that code has already chosen.
2. **Copy rewrites**: before/after versions of the two thinnest product
   descriptions.
3. **Executive summary**: three or four sentences.

Claude never chooses opportunities, ratings, scores or roadmap phases. To
keep its writing grounded:

- Prompts contain only facts from the crawl and the checks, and ask for
  careful wording where detection is uncertain ("we didn't detect X", never
  "you don't have X").
- Answers use structured outputs and are checked again with zod, plus extra
  rules. Every opportunity must be covered, lift must be a range, and **any
  number not present in the facts Claude was given is rejected**. A copy
  rewrite may only use figures from its own product's data.
- A rejected answer is retried once, with the problems listed in the prompt.
  If it fails again, the report uses text built from the checks, so a
  failed call never breaks a report.
- Requests opt into Anthropic's server-side refusal fallback.

A typical audit uses about 9,000 input and 1,500 output tokens.

## HTTP API

### `POST /api/audit`

Starts an audit, or returns one that can be reused: a finished audit of the
same store from the last 24 hours, or one still running. `www.` and bare
domains count as the same store.

```bash
curl -X POST http://localhost:3000/api/audit \
  -H 'content-type: application/json' \
  -d '{"url": "yourstore.com"}'
```

| Status | Body                                                       |
| ------ | ---------------------------------------------------------- |
| 202    | `{ "id": "…", "status": "queued", "reused": false }`       |
| 200    | `{ "id": "…", "status": "done", "reused": true }`          |
| 400    | `{ "error": "That doesn't look like a store address. …" }` |

### `GET /api/audit/:id`

Status and progress, plus the report once `status` is `done`.

```json
{
  "id": "…",
  "domain": "yourstore.com",
  "status": "crawling",
  "stage": "search",
  "progress": 55,
  "message": "Checking search",
  "report": null,
  "createdAt": "2026-11-01T08:45:00.000Z"
}
```

`status` moves through `queued`, `crawling` and `analyzing` to `done` or
`failed`. On failure, `message` explains why in plain words, for example
"example.com doesn't look like a Shopify store."

Once the audit is done, `report` holds the whole report, minus internal
metadata such as Claude token usage.

## The crawler

The crawler (`lib/crawl/`) only reads what any visitor's browser can:

| What                          | Where                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Product catalog (up to 1,000) | `/products.json`, or `sitemap.xml` plus `/products/{handle}.js` as a fallback       |
| Image alt text (30 products)  | `/products/{handle}.js`                                                             |
| Collections                   | `/collections.json`                                                                 |
| Homepage and 5 product pages  | HTML: titles, meta tags, JSON-LD, theme, scripts, forms                             |
| FAQ and contact pages         | Homepage links, `/pages/faq`, `/pages/contact`                                      |
| Search behavior               | `/search` and `/search/suggest.json` for 3 test queries, plus a no-results baseline |
| Installed apps                | Script, stylesheet and widget fingerprints for 66 apps                              |
| Page speed                    | Google's PageSpeed Insights API (4 runs)                                            |

**Etiquette.** It identifies itself as `GrowthLensBot/0.1` with your
`APP_URL`, sends at most 3 requests at a time with starts spaced 250 ms
apart, times out after 10 seconds, and backs off on rate limits. If a
store's bot protection (such as a Cloudflare challenge) answers instead,
the crawler stops and reports the store as blocked. It never tries to get
around the protection, and never treats a challenge page as real data.

**Safety.** Because it fetches addresses typed in by users, every host is
resolved first, and private, loopback and link-local addresses are refused.
This applies to every redirect hop too.

**Responsible use.** The crawler doesn't read `robots.txt`. Shopify's default
`robots.txt` asks general crawlers to stay out of `/search`, which the search
checks use. Run audits on stores you own or have permission to analyze, and
keep the request volume as it is.

**Known limits.**

- Headless storefronts (Hydrogen and other custom frontends) don't expose
  product data, so product checks can't run on them.
- App detection only sees what's in the HTML. Apps that load after cookie
  consent or a click can be missed, and enterprise tools without a public
  script can't be seen at all.
- When a search app renders results with JavaScript, typo and synonym
  handling can't be measured.

## Data and privacy

- **Database.** Each audit row stores the crawl snapshot (product data from
  the public storefront) and the finished report. The `Lead` table holds
  email addresses collected by earlier versions, which asked for one to
  unlock the full report. Nothing writes to it anymore.
- **No store access.** GrowthLens never asks for logins or admin access and
  sees no sales data.
- **Third parties.** Store facts, including product titles and descriptions,
  are sent to Anthropic's API to write the report. Page URLs are sent to
  Google's PageSpeed Insights API. If you run GrowthLens for other people,
  tell them this in your privacy policy.
- **No cookies.** GrowthLens doesn't set any.

## Project structure

```
app/
  page.js                    landing page
  audit/[id]/page.js         progress, then the report
  api/audit/route.js         POST: start or reuse an audit
  api/audit/[id]/route.js    GET: status and report
components/
  report/                    report sections and charts
  audit-form.jsx, audit-view.jsx, climbing-robot.jsx, logo.jsx, site-header.jsx
  ui/                        shadcn/ui components
lib/
  audit.js                   the pipeline: crawl, check, score, write, report
  crawl/                     collectors, HTTP client, app fingerprints, snapshot schema
  checks/                    one file per area
  scoring/                   weights, scores, fixes, roadmap
  llm/                       Claude client, prompts, facts, validation
  report/                    AuditReport schema, builder, public view
  jobs/                      background runner, audit lifecycle
  db.js, url.js
prisma/                      schema and migrations
scripts/                     crawl, audit:dry and audit CLIs
tests/                       Vitest suites and synthetic fixture stores
Dockerfile, docker-compose.yml
```

Built with Next.js 15 (App Router, JavaScript), Tailwind CSS 4 with
shadcn/ui, Prisma 7 on PostgreSQL, zod, cheerio, and the Anthropic SDK.

## Development

| Script               | What it does                                    |
| -------------------- | ----------------------------------------------- |
| `npm run dev`        | Dev server on port 3000                         |
| `npm test`           | Run the test suite once (`test:watch` to watch) |
| `npm run lint`       | ESLint                                          |
| `npm run format`     | Prettier (`format:check` to check only)         |
| `npm run db:migrate` | Create and apply a Prisma migration             |
| `npm run db:studio`  | Browse the database                             |
| `npm run build`      | Production build                                |

The tests run offline. They use synthetic fixture stores
(`tests/fixtures/`), so they need no network, database or API keys, and no
real store's data is committed.

### Adding a check

1. Add a check definition to the right file in `lib/checks/` and include it
   in that file's exported list. A definition has an `id`, `area`, `title`,
   `metric`, `threshold` and a `run(snapshot)` function returning `passed`
   (`true`, `false`, or `null` when it can't be measured), `value`,
   `display` and `evidence`. Evidence sentences cite exact figures, because
   Claude may only repeat numbers that appear in them.
2. Give it a weight in `lib/scoring/weights.js`, keeping the area's weights
   at a total of 100.
3. Map it to a fix, with impact and effort, in `lib/scoring/fixes.js`.
4. Add tests. `tests/scoring/score.test.js` fails if a check has no weight or
   fix, or if an area's weights don't add up to 100.

### Adding an app fingerprint

Add an entry to `lib/crawl/apps-fingerprints.js` with the app's categories,
the URL or script `patterns` that identify it, and optional widget
`selectors`. Match brands whose names are everyday words ("Gladly",
"Drift") by domain only, since inline scripts also contain product text.

## Deployment

GrowthLens runs audits in the same process as the web app, so it needs a
long-running Node server rather than serverless functions. It also assumes
one instance: when the server restarts, audits that were in progress are
marked as interrupted.

Set `DATABASE_URL`, `APP_URL`, `ANTHROPIC_API_KEY` and `PAGESPEED_API_KEY`
in production.

### Docker Compose behind Traefik

`docker-compose.yml` runs the app behind an existing
[Traefik](https://traefik.io/) proxy and connects it to an existing Postgres
container. It expects:

- two external Docker networks: `proxy`, which Traefik is on, and `pg`, which
  Postgres is on
- a Traefik entrypoint named `websecure` and a certificate resolver named `le`

Change the domain in the `Host(...)` rule to your own. Then create `.env`
from `.env.example` and set:

- `APP_URL` to `https://` plus that domain
- `DATABASE_URL` with the Postgres container's name as the host, e.g.
  `postgresql://postgres:secret@postgres:5432/ai_audit_tool?schema=public`

To deploy, apply any pending migrations, then build and start the app:

```bash
docker compose run --rm --build migrate
docker compose up -d --build
```

Run both commands on every deploy. Without `--build`, `migrate` would use the
migrations from its last build. It creates the database if it doesn't exist,
which needs a Postgres user that is allowed to create databases. `migrate` is
in the `tools` profile, so `up` never starts it. To follow the logs, run
`docker compose logs -f app`.

Without Traefik, change the networks and labels to suit your proxy. The app
listens on port 3000.

### Without Docker

```bash
npm ci
npx prisma migrate deploy
npm run build
npm start
```

## Roadmap

- [ ] PDF export of the full report
- [ ] Rate limiting (5 audits per IP per hour)
- [ ] Public sample report

## Contributing

Issues and pull requests are welcome. Before opening a pull request, run
`npm test`, `npm run lint` and `npm run format`. Two rules keep reports
trustworthy:

- **Scores stay deterministic.** Anything that affects a score, an
  opportunity, a rating or a roadmap phase belongs in code.
- **Reports never state anything the data doesn't support.** If a value is
  unknown, the report says so.
