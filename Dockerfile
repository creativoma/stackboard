# syntax=docker/dockerfile:1
#
# Three stages: install deps with bun (this repo's package manager), build with
# bun, then run the standalone Next.js output on plain node — the runtime image
# never needs bun or the source tree, with one deliberate exception in the
# runner stage below: an isolated drizzle-kit CLI, needed so the container can
# migrate itself on boot (see CMD at the bottom — deliberately not a Coolify
# Pre-Deployment Command, which is unreliable at actually targeting the new
# image on a Docker Compose deploy; a container that migrates itself has
# nowhere else to point at and no such race).
#
# The jobs worker (db/jobs-worker.ts) is not started by this image's default
# CMD — run it as a second service from this same image with the entrypoint
# override in docker-compose.prod.yml (`node node_modules/.bin/tsx
# db/jobs-worker.ts` from /worker, since this stage has no bun binary).

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

# A self-contained drizzle-kit toolkit — its own node_modules, its own copy of
# the schema/migrations — isolated from the app's own node_modules (which
# Next's standalone tracing never bundled drizzle-kit into, since it's a
# devDependency). Kept as its own package.json/lockfile so it never touches
# the app's runtime deps. Built here (this stage still has bun) and only the
# resulting directory is copied into the node-based runner below.
RUN mkdir -p /drizzle-cli/db && \
    cp db/schema.ts /drizzle-cli/db/ && \
    cp -r db/migrations /drizzle-cli/db/ && \
    cp drizzle.config.ts /drizzle-cli/ && \
    cd /drizzle-cli && echo '{}' >package.json && \
    bun add drizzle-kit@^0.31.10 drizzle-orm@^0.45.2 postgres@^3.4.9 dotenv@^17.4.2

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# The isolated drizzle-kit toolkit built in the builder stage above — run
# from CMD on every boot, before the server starts (see bottom of this file).
COPY --from=builder --chown=nextjs:nodejs /drizzle-cli /drizzle-cli

# db/jobs-worker.ts (started as a second service via `bun run db:jobs:work`,
# see docker-compose.prod.yml) needs the tsx runner and the app's own source
# and dependencies, so it runs from the full builder tree rather than the
# standalone output. Kept in the same image to avoid a second build.
COPY --from=builder --chown=nextjs:nodejs /app /worker

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
# Migrate before serving: a container that starts accepting traffic (and
# passing its healthcheck) against an unmigrated database means every page
# querying the DB 500s until something runs the migration — which is exactly
# what a separate, easy-to-forget Pre-Deployment Command risks. `worker`
# overrides this whole CMD with its own entrypoint in docker-compose.prod.yml,
# so it never runs this migrate step (nor should it — one migrator is enough).
CMD ["sh", "-c", "cd /drizzle-cli && node node_modules/.bin/drizzle-kit migrate && cd /app && exec node server.js"]
