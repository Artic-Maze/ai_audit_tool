# syntax=docker/dockerfile:1

# Same Node major as development (see "engines" in package.json).
FROM node:24-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    PATH=/app/node_modules/.bin:$PATH
# Prisma's migration engine needs OpenSSL, which the slim image leaves out.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Every dependency and the built app. The `migrate` service in
# docker-compose.yml runs from this stage, since it has the Prisma CLI.
FROM base AS builder
COPY package.json package-lock.json prisma7.config.mjs ./
COPY prisma ./prisma
RUN npm ci
COPY . .
# lib/db.js needs a database URL to load, but nothing connects during the build.
RUN DATABASE_URL="postgresql://build@localhost:5432/build" npm run build \
  && rm -rf .next/cache

# Drops the dev dependencies but keeps the generated Prisma client.
FROM builder AS deps
RUN npm prune --omit=dev

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY package.json next.config.mjs ./
USER node
EXPOSE 3000
CMD ["next", "start"]
