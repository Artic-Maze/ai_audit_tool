# Shopify AI Growth Audit

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
