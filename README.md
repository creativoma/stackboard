<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/logos/logo-color-dark.svg">
    <img src="./public/logos/logo-color.svg" alt="Stackboard" height="56">
  </picture>
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/Next.js-App%20Router-black" alt="Next.js App Router">
  <img src="https://img.shields.io/badge/Postgres-Drizzle%20ORM-4169E1" alt="Postgres via Drizzle ORM">
</p>

# Stackboard

A focused, Trello-style board for one team managing one shared project. Built
with Next.js App Router (Server Components + Server Actions) and Postgres via
Drizzle ORM. Self-hostable, MIT licensed.

## Features

- **Boards** with ordered columns, drag-and-drop cards, WIP limits, and
  reversible archiving — plus a list view, per-board colors, and custom labels
- **Cards** with assignees, due dates, checklists, linked subtasks,
  cycle-safe dependencies, comments, Jira-style priority, and file
  attachments with inline image/PDF previews
- **Views**: filters with saved views, a monthly calendar, a live analytics
  dashboard, a Gantt/timeline view, and a cross-board "My cards" view
- **Collaboration**: real-time sync (SSE), notifications with @mentions and
  due-date reminders, card watchers, a read-only observer role, and public
  read-only board links
- **Data**: search across boards/cards/comments, board and card templates,
  import from Trello or Stackboard JSON/CSV, and export back out
- **Self-hosting**: Dockerfile + production Compose stack (web, worker,
  Postgres, MinIO), health endpoint, migrate-on-boot

## Prerequisites

- Node.js 20+ and [Bun](https://bun.sh) (the project uses `bun` as the package manager/runner; `npm`/`pnpm` work too since there's no Bun-only API in use)
- Docker (for local Postgres + MinIO via `docker-compose.yml`) — or any reachable Postgres 16+ instance
- (Optional) A [Resend](https://resend.com) API key, only needed to send real invite emails

## Local setup

```bash
bun install
cp .env.example .env          # the defaults match the compose database below
docker compose up -d          # starts Postgres on localhost:5432 (and MinIO, unused by default)
bun run db:migrate            # applies db/migrations
bun run db:seed               # loads representative seed data (wipes the DB first!)
bun run dev                   # http://localhost:3000
```

Sign in with any of the seeded accounts (password `password123`):

| Email               | Role on "Product Launch"                                           |
| ------------------- | ------------------------------------------------------------------ |
| `alice@example.com` | owner                                                              |
| `bob@example.com`   | member (has one unread notification)                               |
| `carol@example.com` | member                                                             |
| `grace@example.com` | **observer** — read-only; every mutation is rejected server-side   |
| `dave@example.com`  | **not a member** — use this to see the permission-restricted state |

Environment variables are documented in `.env.example` and
[docs/configuration.md](./docs/configuration.md). What the seed data covers is
described in [docs/architecture.md](./docs/architecture.md#seed-data).

## Migrations

Schema lives in `db/schema.ts`; SQL migrations are generated files under
`db/migrations/`, tracked in git.

```bash
bun run db:generate   # after editing db/schema.ts, generate a new migration
bun run db:migrate    # apply pending migrations
bun run db:studio     # optional: browse the DB with Drizzle Studio
```

There is no down-migration runner — the rollback approach is described in
[docs/architecture.md](./docs/architecture.md#known-limitations).

## Tests

```bash
bun run test              # unit tests (vitest)
bun run test:integration  # needs a stackboard_test database
bun run test:e2e          # Playwright, builds and boots the app
bun run typecheck         # strict TypeScript pass
bun run lint              # ESLint
bun run knip              # unused files, dependencies, and exports
```

Setup details, what each suite covers, and the CI pipeline:
[docs/testing.md](./docs/testing.md).

## Documentation

| Doc                                              | Covers                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------- |
| [docs/deployment.md](./docs/deployment.md)       | Docker Compose stack, any-Node-host deploys, health endpoint, backup/restore |
| [docs/configuration.md](./docs/configuration.md) | Every environment variable                                                   |
| [docs/architecture.md](./docs/architecture.md)   | How each feature is built (jobs, SSE, attachments, views, …)                 |
| [docs/security.md](./docs/security.md)           | Authorization, sessions, uploads, tokens — the security decisions            |
| [docs/testing.md](./docs/testing.md)             | Test suites, isolated DBs, e2e journeys, CI                                  |
| [DESIGN.md](./DESIGN.md)                         | The "Blueprint" design system                                                |

## Roadmap and changelog

See [ROADMAP.md](./ROADMAP.md) for known gaps and planned work, and
[CHANGELOG.md](./CHANGELOG.md) for release history. The same changelog is
rendered in-app at `/boards/changelog`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to propose changes, coding
conventions, and the PR checklist.

## License

[MIT](./LICENSE)
