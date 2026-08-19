<p align="center">
  <img src="./public/logos/logo-color.svg" alt="Stackboard" height="56">
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/Next.js-App%20Router-black" alt="Next.js App Router">
  <img src="https://img.shields.io/badge/Postgres-Drizzle%20ORM-4169E1" alt="Postgres via Drizzle ORM">
</p>

A focused, Trello-style board for one team managing one shared project. Boards with ordered columns, drag-and-drop cards, checklists, linked subtasks, card dependencies, comments, a per-card and board-wide activity trail, filters with saved views, a calendar, an analytics dashboard, a Gantt/timeline view, and reversible archiving — plus real-time sync (SSE), notifications with @mentions (autocomplete included) and due-date reminders, card watchers, a read-only observer role, WIP limits, Jira-style card priority, search across boards/cards/comments, a "My cards" view, board and card templates, public read-only board links, and file attachments with inline image/PDF previews. Built with Next.js App Router, Server Components, Server Actions, and Postgres via Drizzle ORM.

<p align="center">
  <img src="./screenshot.png" alt="Stackboard board view with columns, labeled cards, priorities, due dates, and checklist progress" width="900">
</p>

## Prerequisites

- Node.js 20+ and [Bun](https://bun.sh) (the project uses `bun` as the package manager/runner; `npm`/`pnpm` work too since there's no Bun-only API in use)
- Docker (for local Postgres via `docker-compose.yml`) — or any reachable Postgres 16+ instance
- (Optional) A [Resend](https://resend.com) API key, only needed to send real invite emails

## Local setup

```bash
bun install
cp .env.example .env          # fill in SESSION_SECRET at minimum
docker compose up -d          # starts Postgres on localhost:5432
bun run db:migrate            # applies db/migrations
bun run db:seed               # loads representative seed data (see below)
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

## Environment variables

See `.env.example` for the full list with descriptions. Summary:

| Variable               | Purpose                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Postgres connection string                                                                                                    |
| `SESSION_SECRET`       | Placeholder for a future signed-cookie secret (see Security decisions)                                                        |
| `APP_URL`              | Base URL used to build absolute invite links in emails                                                                        |
| `RESEND_API_KEY`       | If unset, invite emails are logged to the console instead of sent (deterministic local dev path)                              |
| `EMAIL_FROM`           | From-address for invite emails                                                                                                |
| `UPLOAD_DIR`           | Directory for attachment bytes via the local-disk storage adapter (default `./var/uploads`), used when `S3_ENDPOINT` is unset |
| `WEB_BIND`             | Host interface `docker-compose.prod.yml` publishes `web` on (default `127.0.0.1`); `0.0.0.0` exposes the app unproxied        |
| `WEB_PORT`             | Host port for the same mapping (default `3000`); change it when another service already holds the port                        |
| `S3_ENDPOINT`          | S3-compatible endpoint (MinIO in production); when set, attachments go there instead of local disk                            |
| `S3_BUCKET`            | Bucket name for attachment storage                                                                                            |
| `S3_ACCESS_KEY_ID`     | Access key for the S3-compatible endpoint                                                                                     |
| `S3_SECRET_ACCESS_KEY` | Secret key for the S3-compatible endpoint                                                                                     |
| `S3_REGION`            | Region passed to the S3 client (default `us-east-1`; MinIO ignores the value but the SDK requires one)                        |

## Migrations

Schema lives in `db/schema.ts`; SQL migrations are generated files under `db/migrations/`, tracked in git.

```bash
bun run db:generate   # after editing db/schema.ts, generate a new migration
bun run db:migrate    # apply pending migrations
bun run db:studio     # optional: browse the DB with Drizzle Studio
```

**Rollback:** Drizzle-kit doesn't ship a built-in `down` migration runner. To roll back, restore from a backup (see below) or hand-write and apply a compensating SQL migration — for a single-tenant, single-environment app of this size that's the simpler and safer path than maintaining a full down-migration story.

## Seed data

`bun run db:seed` **wipes all tables** in whatever database `DATABASE_URL` points at and reloads a fixed dataset across five boards with distinct board colors. It exercises:

- the happy path ("Product Launch": an active board, columns, labeled/assigned/due cards, checklists, comments)
- an **observer** member (`grace@example.com`, on "Product Launch" and "Mobile App v2"), a **WIP limit** on "Marketing Website Redesign" → Development, **card watchers**, and **unread notifications**
- an **empty** column (`Blocked` on "Product Launch")
- **overdue** cards, an **archived** card, and two **archived boards** ("Q1 Retro (closed)", "2025 Roadmap (closed)")
- a **pending** invitation and an **expired** invitation
- a **permission-restricted** state (`dave@example.com` is only a member of "Support Triage")
- a **fully empty board** ("New Team Onboarding" — no columns) and a **near-empty** board ("Support Triage")
- extra users `henry@example.com` / `ivy@example.com` spread across the newer boards

Never point `db:seed` at a database you care about — it deletes everything first.

## Tests

Three layers, each with its own isolated setup:

```bash
bun run test              # unit tests (vitest) — pure domain logic, no I/O
bun run test:integration  # integration tests against a real, isolated Postgres DB
bun run test:e2e          # Playwright browser tests covering all user journeys
```

- **Unit** (`lib/**/__tests__`, `lib/domain/__tests__`): authorization predicates (including the observer role), position/reorder math, filter logic, invitation expiry rules, markdown-lite XSS safety, password hashing, WIP-limit checks, due-date bucketing, mention parsing, notification fan-out rules, search-query normalization, attachment validation/filename sanitizing, SSE event shaping, board-template definitions, analytics tallying, calendar month-grid math, subtask rollup, dependency cycle detection, and Gantt bar/range layout.
- **Integration** (`test/integration/db.test.ts`): runs against `stackboard_test`, a separate database from your dev DB. It drops and recreates the schema before each run and wipes tables between tests, so it is safe to run repeatedly but **must never point at a database with real data** — the suite refuses to start unless `DATABASE_URL` contains `stackboard_test`. Create it once with:
    ```bash
    docker exec -it <postgres-container> psql -U stackboard -d stackboard -c "CREATE DATABASE stackboard_test;"
    ```
- **End-to-end** (`test/e2e/*.spec.ts`, Playwright): builds and boots the app against your real dev database (reseeded via `global-setup.ts`), then drives a real browser through:
    1. owner creates a board, invites a teammate, adds a card with assignee/due date/checklist
    2. teammate filters to their cards, completes a checklist item, comments, and **drags** a card to Done (real pointer events, not a simulated event)
    3. owner archives a card and an empty column, reviews the activity trail, restores the card into a chosen column
    4. a card created by one member appears on another member's open board with no interaction (real-time SSE sync)
    5. a non-member is denied access to the board via a direct URL (acceptance scenario)
    6. the board is usable at a 390×844 mobile viewport

Run `bun run typecheck` for a strict TypeScript pass (the project has no `any`-shaped escape hatches in application code) and `bun run lint` for ESLint.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request, in three parallel jobs:

| Job           | What it runs                                                                        |
| ------------- | ----------------------------------------------------------------------------------- |
| `unit`        | `lint`, `typecheck`, `test`, `build`                                                |
| `integration` | `test:integration` against a `postgres:16` service container (`stackboard_test` DB) |
| `e2e`         | `db:migrate` then `test:e2e` (Chromium); uploads the Playwright report on failure   |

## Deployment

### Containerized (Docker Compose / Coolify)

`Dockerfile` + `docker-compose.prod.yml` run the whole stack — `web`, `worker`, Postgres, and MinIO — on a single host. Verify locally before touching a server:

```bash
docker compose -f docker-compose.prod.yml up --build
```

For a Coolify deploy, use a **Git Repository** resource with the **Docker Compose** build pack pointed at `docker-compose.prod.yml` (not the "Docker Compose" card, which stores the YAML in Coolify's database and leaves the `build:` contexts with nothing to build from). Set every real value in Coolify's own env panel. The `ports:` block on `web` needs no editing — it binds to `127.0.0.1` by default, which Coolify ignores entirely (it reaches the container over the project's Docker network) and which keeps the app off the public internet without TLS. Migrations need no deploy hook — the `web` container runs them itself on boot (see below).

### Health endpoint

`GET /api/health` reports whether the app can actually serve, not just whether the process is up. It probes Postgres with a timed `select 1` and measures how long the oldest already-due job has been waiting — a `web` container can be perfectly responsive while the `worker` is dead and no invite email is going out.

```json
{
    "status": "ok",
    "checks": [
        { "name": "database", "status": "ok", "durationMs": 3 },
        {
            "name": "jobs",
            "status": "ok",
            "durationMs": 2,
            "detail": "0 due, oldest n/a"
        }
    ],
    "timestamp": "2026-08-19T21:00:00.000Z"
}
```

`status` is `ok`, `degraded` (slow database, or the queue running late), or `down`. The response is `200` for the first two and `503` for `down`, so an uptime monitor or load balancer sees a failure without parsing the body. Thresholds live in `lib/domain/health.ts`.

The endpoint is unauthenticated by design — the container healthcheck in `docker-compose.prod.yml` calls it — so the body carries statuses and timings only, never error text, which could leak the database host or user. Real errors go to the server log. Point an external uptime monitor at it and alert on non-`200`; to catch `degraded` too, match the body against `"status":"ok"`.

### Migrations on deploy

The `web` image's start command is `drizzle-kit migrate && exec node server.js`, so every container migrates before it serves. This is deliberate: a container that starts serving (and passing its healthcheck) against an unmigrated database returns 500s from every page that touches the DB. Coolify's Pre-Deployment Command was tried first and is _not_ reliable here — it's ambiguous whether it runs against the newly-built image or the outgoing one.

### ⚠️ Rotating `POSTGRES_PASSWORD` on an existing database

**Changing `POSTGRES_PASSWORD` in your host's env panel is not enough**, and it fails in a way that's genuinely hard to diagnose. The Postgres image only reads that variable when it initializes an _empty_ data directory; once the volume holds data, the real password lives inside the database and the variable is ignored. Change only the variable and `web`/`worker` will authenticate with the new value against a database that still expects the old one — they can't connect, never pass their healthcheck, and the orchestrator may delete the containers before you can read their logs.

Rotate in this order:

1. Change the password _in the database first_, against the running container:
    ```bash
    docker exec -it <db-container> psql -U stackboard -d stackboard \
      -c "ALTER USER stackboard WITH PASSWORD 'the-new-value';"
    ```
2. Then set `POSTGRES_PASSWORD` to that same value in the env panel.
3. Redeploy.

The same applies to any other credential baked into a volume on first init.

### Any Node.js host (no containers)

Vercel, Fly, Render, a plain VM:

1. Provision Postgres and set `DATABASE_URL`.
2. Set `SESSION_SECRET`, `APP_URL` (your public URL), and `RESEND_API_KEY`/`EMAIL_FROM` if you want real invite emails.
3. Run `bun run db:migrate` as a release step before starting new instances.
4. `bun run build && bun run start`.
5. Run the jobs worker (`bun run db:jobs:work`) as a second long-lived process — see Background jobs.
6. If you deploy to multiple instances/regions, set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` to a stable value shared across them (see Next.js's Server Actions guide) so Server Action payloads stay decryptable across instances.

## Integration setup: email (Resend)

- Without `RESEND_API_KEY`, `lib/email/send.ts` logs the invite email to the console instead of sending it — the invite flow is fully usable in development without any credentials.
- With a key set, it sends via Resend, races the call against an 8s timeout, and normalizes provider/timeout errors into a single `EmailDeliveryError` so callers never see raw SDK exceptions.
- Invite tokens are cryptographically random, stored **hashed** (SHA-256) — the raw token only ever exists in the emailed URL and is never persisted or logged.
- Email content is HTML-escaped before interpolation (board name, inviter name, URL) to prevent injection into the outbound message.
- Sending happens out of the request path — see Background jobs below.

## Background jobs

Invite emails are sent by a Postgres-backed job queue instead of inline within the Server Action request:

- `inviteMemberAction` (`lib/actions/invitations.ts`) enqueues a `send_invite_email` job via `lib/jobs/queue.ts` and returns immediately — the invitation row and job are both written before the response goes out, so an invite is never lost even if no worker is running yet. Notification emails work the same way (`send_notification_email`, fanned out by `lib/notifications/create.ts`).
- `bun run db:jobs:work` (`db/jobs-worker.ts`) polls the `jobs` table every 2s, claims due rows with `SELECT ... FOR UPDATE SKIP LOCKED` (safe with multiple worker processes), and dispatches by `type` to a handler in `lib/jobs/handlers.ts`. A failed job is retried with exponential backoff (capped at 60s) up to 5 attempts, then marked `failed` with the error recorded on the row.
- The same worker also runs an hourly **due-soon scan** (`scanDueSoonCards` in `lib/jobs/worker.ts`): active cards due within 24h are claimed atomically via `due_reminder_sent_at IS NULL`, so assignee + watchers get exactly one reminder even with several workers running.
- Run the worker alongside the app in any environment that can host a long-lived process (a second container/dyno, a systemd service, etc.) — there's no separate queue service to stand up.
- `lib/email/send.ts` has no `server-only` import (unlike most server code in this app) specifically so the worker — a plain `tsx` script outside Next's server bundling — can import it directly; `lib/email/adapter.ts` re-exports it with the guard for use inside Next Server Actions.

## Backup and restore

This app doesn't ship its own backup tooling — use standard Postgres tooling against `DATABASE_URL`:

```bash
pg_dump "$DATABASE_URL" -Fc -f backup.dump   # backup
pg_restore -d "$DATABASE_URL" --clean backup.dump   # restore
```

Take a backup before running `db:migrate` against a production database, and before any manual data-repair `psql` session.

## Security decisions

- **Authorization is enforced server-side on every mutation**, not just in the UI. Every Server Action re-reads the caller's board membership from the database via `requireMembership`/`requireOwner` (`lib/actions/helpers.ts`) — it never trusts a role or membership flag passed from the client. Removing a member flips their `board_memberships.status` to `removed`; their next request re-reads that row and is denied, even for a card edit form they had already loaded (covered by the acceptance-scenario integration test).
- **Sessions** are opaque random tokens in an httpOnly, `sameSite=lax` cookie; only a SHA-256 hash of the token is stored server-side, so a database leak doesn't hand out valid session tokens. `SESSION_SECRET` is reserved in `.env.example` for a future move to signed/stateless sessions; the current implementation is DB-backed and revocable (logging out deletes the row), which is why a stolen-secret scenario is less of a concern than usual — the main exposure is XSS-via-cookie-theft, mitigated by httpOnly.
- **Passwords** are hashed with scrypt (Node's built-in `crypto.scrypt`, 64-byte derived key, random 16-byte salt per password) and compared with `timingSafeEqual`.
- **Markdown descriptions** go through a hand-rolled `renderMarkdownLite` (`lib/markdown.ts`) that HTML-escapes the entire input _before_ applying any formatting substitution, so user input can never introduce a new tag or attribute — only the literal `<strong>`/`<em>`/`<code>`/`<a>` tags the renderer itself writes ever appear in the output. Links are restricted to `http(s)://` schemes.
- **Invite emails** escape all interpolated values and only ever link to a same-origin `/invite/<token>` URL.
- **Roles**: `owner` > `member` > `observer`. Observers are active members for read access, but `requireContentEditor` (`lib/actions/helpers.ts`) rejects every content mutation server-side, and invitations carry the granted role (owners are never created by invite).
- **File uploads** go through a server-only object-storage adapter (`lib/storage/`) with server-generated keys — the user's filename never becomes a filesystem path, names are sanitized (`lib/domain/attachments.ts`) before display or `Content-Disposition`, size is validated server-side (10MB), and downloads re-check board membership on every request. OAuth remains out of scope.
- **@mentions** resolve only against active board members and comments stay plain text — the mention highlighter (`app/_components/comment-body.tsx`) builds React nodes, never HTML.
- **The SSE channel** (`/boards/:boardId/events`) authenticates the session cookie and re-checks board membership before streaming, and only ever emits event timestamps/ids — no card content travels over it.
- **Board import (Trello/Stackboard JSON exports, or a Stackboard CSV export)** is authenticated-only, validates and length-limits every field server-side (via `zod` for JSON, matching length checks for CSV) before insert, and creates a brand-new board scoped to the importing user — it never merges into or overwrites an existing board.
- Every user-facing form validates and length-limits input server-side with `zod`, independent of any client-side `maxLength`/`required` attributes.
- **Public board link tokens** (`boards.publicToken`) are stored in plaintext, unlike session and invite tokens (both hashed). This is a deliberate exception: the token only ever grants _read_ access to content that's already visible to every board member, it's owner-revocable/rotatable at any time, and the owner needs to look the link up again later (Settings → Public link) without regenerating it — a hash would make that impossible, the same tradeoff Trello/Notion-style share links make. `generatePublicLinkAction`/`revokePublicLinkAction` (`lib/actions/public-links.ts`) are owner-only via `requireOwner`, and the public route (`app/p/[token]/page.tsx`) never exposes assignees, comments, attachments, or activity — see Public read-only board links below.

## Real-time sync

Boards sync live over Server-Sent Events: `app/boards/[boardId]/events/route.ts` authenticates the member, then watermark-polls the board's activity trail (2s interval, backed by the existing `activity_board_idx`) and emits an event whenever something new lands; the client (`board-live.tsx`) responds with `router.refresh()`. No WebSocket server, no LISTEN/NOTIFY plumbing, no shared in-process state — it behaves identically on one VM or many instances. Changes that don't write activity (same-column card reorders) still converge on the next navigation/mutation, as before.

## Attachments

Cards accept file attachments (10MB cap, validated server-side in `lib/domain/attachments.ts`). Bytes go through a server-only `ObjectStorage` adapter (`lib/storage/adapter.ts`) with server-generated keys (`boardId/attachmentId` — user filenames never touch the storage key). `lib/storage/index.ts` picks the S3-compatible implementation (`lib/storage/s3.ts`, MinIO in production — see `S3_ENDPOINT` above) when configured, falling back to local disk under `UPLOAD_DIR` (`lib/storage/local.ts`) otherwise. Downloads stream through an authenticated route that re-checks board membership on every request. Image attachments (`mime_type` starting with `image/`) render an inline thumbnail, and both images and PDFs can be expanded into a full preview (`<img>`/`<iframe>`) without leaving the card — the route serves those two types with `Content-Disposition: inline` and everything else with `attachment`.

## Search

`/boards/search` searches three things at once, scoped to boards the caller actively belongs to: card titles/descriptions (Postgres full-text via `cards_search_idx`, ILIKE fallback), board names, and comment bodies (`lib/queries/search.ts`). Results render as three sections (Boards / Cards / Comments), only shown when non-empty. Board/comment search is a plain `ILIKE` scan — see ROADMAP if that needs an index later.

## Activity and saved views

- **Per-card activity** shows on each card's detail page; **board-wide activity** (`/boards/:boardId/activity`) lists every event across the board, most recent first, backed by the existing `activity_board_idx` index — no extra query cost beyond dropping the `card_id` filter.
- **Saved filtered views**: the board's filter bar writes its state to the URL query string as before; `app/boards/[boardId]/saved-views.tsx` lets a member name and re-apply a combination, stored in `localStorage` per board — no schema change, and not shared between browsers or teammates.

## Calendar and analytics

- **Calendar** (`/boards/:boardId/calendar`): a Monday-first monthly grid of active cards by due date, navigable via `?month=YYYY-MM`. Grid geometry and date-bucketing are pure functions in `lib/domain/calendar.ts` (unit-tested) so the month-boundary math (padding to full weeks, leap years, month rollover) never touches a component.
- **Analytics** (`/boards/:boardId/analytics`): active/overdue/archived counts, checklist completion, and cards-by-column / cards-by-priority / load-per-member breakdowns as CSS bar lists — all computed live from `getActiveColumnsWithCards` with no new tables or chart library. `lib/domain/analytics.ts` (unit-tested) holds the tallying; there's no historical snapshot table, so this is a live snapshot, not a true burndown-over-time chart (see ROADMAP).

## Subtasks and dependencies

- **Linked subtasks**: `cards.parentCardId` is a nullable self-reference (`db/schema.ts`). "Add subtask" (`lib/actions/subtasks.ts#addSubtaskAction`) creates a new card in the parent's own column, subject to the same WIP-limit check as any other card. The card detail page shows a "Subtask of …" breadcrumb when a card has a parent, and a subtasks list with a done/total progress bar — done means archived, the same status Stackboard already uses everywhere else (`lib/domain/subtasks.ts`, unit-tested).
- **Card dependencies**: a new `card_dependencies` table stores directed "blocks" edges. The card detail page's Dependencies section lists "Blocked by" and "Blocks" and can add a blocker from a picker of the board's other active cards. Adding an edge that would create a cycle — direct or transitive — is rejected server-side before the insert (`lib/domain/dependencies.ts#wouldCreateCycle`, a BFS over the board's existing edges, unit-tested).

## Timeline (Gantt)

`/boards/:boardId/gantt` plots active cards with a `startDate` and/or `dueDate` (a card with only one renders as a single-day bar) as horizontal bars grouped by column. All the positioning is pure percentage math (`lib/domain/gantt.ts`, unit-tested): `deriveDateRange` spans every dated card plus today with padding, `barLayout` clamps a bar into that range, and `todayOffsetPct` places a translucent marker line. A lock icon flags a card still blocked by another _active_ card, reusing the dependency edges above — an archived (done) blocker no longer counts. Cards with neither date are excluded and counted in a footnote rather than silently dropped. There's no drag-to-reschedule and no dependency connector lines yet (see ROADMAP).

## Card templates

Creating a card can seed it from a built-in template (`lib/templates/cards.ts`): Bug report, Feature request, or Task, each inserting a starter checklist (Bug report also defaults priority to High). This reuses the normal `createCardAction` insert path plus one bulk checklist insert — unlike board templates (`lib/templates/boards.ts`), it doesn't need the import pipeline's transactional path since there's only one row of fan-out.

## Public read-only board links

A board owner can turn on a share link from Settings → Public link (`app/boards/[boardId]/settings/public-link-form.tsx`, owner-only via `requireOwner`). The link (`/p/:token`, outside the authenticated `/boards` layout, same pattern as `/invite/:token`) needs no account and renders active columns and cards read-only — title, priority, due date, checklist progress. Assignee names, comments, attachments, and the activity trail are deliberately left out to keep the public surface minimal (`lib/queries/public-board.ts`). Regenerating rotates the token (the old link stops working immediately); turning it off clears `boards.publicToken` entirely.

## Known limitations

- **Two TypeScript packages are installed on purpose.** ESLint's toolchain (`typescript-eslint`) can't run on the TypeScript 7.0 API yet, so the project follows the [side-by-side layout](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0) Microsoft recommends: `typescript` resolves to 6.x — the API every JS tool imports — while TypeScript 7 stays installed as `@typescript/native` and provides the `tsc` binary. So `bun run typecheck` still compiles with TS 7 (the version of record) and `bun run lint` works. ESLint is pinned to 9.x for the same reason: `eslint-plugin-react`, pulled in by `eslint-config-next`, doesn't support ESLint 10 yet. Both pins can be dropped once the upstream tools catch up ([typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)).
- **Drizzle-kit has no down-migration runner** — see the Migrations section for the rollback approach used instead.

## Roadmap and changelog

See [ROADMAP.md](./ROADMAP.md) for known gaps and planned work, and
[CHANGELOG.md](./CHANGELOG.md) for release history. The same changelog is
rendered in-app at `/boards/changelog`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to propose changes, coding conventions, and the PR checklist.

## License

[MIT](./LICENSE)
