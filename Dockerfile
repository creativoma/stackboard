# syntax=docker/dockerfile:1
#
# Three stages: install deps with bun (this repo's package manager), build with
# bun, then run the standalone Next.js output on plain node — the runtime image
# never needs bun or the source tree, with one deliberate exception in the
# runner stage below: an isolated drizzle-kit CLI, needed so a deploy can
# actually run its migrations (e.g. via Coolify's Pre-Deployment Command).
#
# The jobs worker (db/jobs-worker.ts) is not started by this image's default
# CMD — run it as a second service from this same image with
# `bun run db:jobs:work` as the command override (see docker-compose.prod.yml).

FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Values only needed to satisfy module-level env checks during the build
# (db/index.ts throws at import time if DATABASE_URL is unset); the real
# values are injected at `docker run`/Coolify time and nothing here is baked
# into the image.
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stackboard \
    SESSION_SECRET=build-time-placeholder-not-used-at-runtime \
    APP_URL=http://localhost:3000
RUN bun run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# A self-contained drizzle-kit toolkit — its own node_modules, its own copy of
# the schema/migrations — isolated from the app's own node_modules (which
# Next's standalone tracing never bundled drizzle-kit into, since it's a
# devDependency). Kept as its own package.json/lockfile so it never touches
# the app's runtime deps. From inside /drizzle-cli, `bun run drizzle-kit
# migrate` runs as Coolify's Pre-Deployment Command against this same
# container — there's nowhere else for that hook to point at.
COPY --from=builder /app/db/schema.ts /drizzle-cli/db/schema.ts
COPY --from=builder /app/db/migrations /drizzle-cli/db/migrations
COPY --from=builder /app/drizzle.config.ts /drizzle-cli/drizzle.config.ts
RUN cd /drizzle-cli && echo '{}' >package.json && \
    bun add drizzle-kit@^0.31.10 drizzle-orm@^0.45.2 postgres@^3.4.9 dotenv@^17.4.2

# db/jobs-worker.ts (started as a second service via `bun run db:jobs:work`,
# see docker-compose.prod.yml) needs the tsx runner and the app's own source
# and dependencies, so it runs from the full builder tree rather than the
# standalone output. Kept in the same image to avoid a second build.
COPY --from=builder --chown=nextjs:nodejs /app /worker

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
