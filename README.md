# Stackboard

A focused, Trello-style board for one team managing one shared project. Boards with ordered columns, drag-and-drop cards, checklists, comments, an activity trail, filters, and reversible archiving — built with Next.js App Router, Server Components, Server Actions, and Postgres via Drizzle ORM.

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
| `bob@example.com`   | member                                                             |
| `carol@example.com` | member                                                             |
| `dave@example.com`  | **not a member** — use this to see the permission-restricted state |

## Environment variables

See `.env.example` for the full list with descriptions. Summary:

| Variable         | Purpose                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`   | Postgres connection string                                                                       |
| `SESSION_SECRET` | Placeholder for a future signed-cookie secret (see Security decisions)                           |
| `APP_URL`        | Base URL used to build absolute invite links in emails                                           |
| `RESEND_API_KEY` | If unset, invite emails are logged to the console instead of sent (deterministic local dev path) |
| `EMAIL_FROM`     | From-address for invite emails                                                                   |

## Migrations

Schema lives in `db/schema.ts`; SQL migrations are generated files under `db/migrations/`, tracked in git.

```bash
bun run db:generate   # after editing db/schema.ts, generate a new migration
bun run db:migrate    # apply pending migrations
bun run db:studio     # optional: browse the DB with Drizzle Studio
```

**Rollback:** Drizzle-kit doesn't ship a built-in `down` migration runner. To roll back, restore from a backup (see below) or hand-write and apply a compensating SQL migration — for a single-tenant, single-environment app of this size that's the simpler and safer path than maintaining a full down-migration story.

## Seed data

`bun run db:seed` **wipes all tables** in whatever database `DATABASE_URL` points at and reloads a fixed dataset. It exercises:

- the happy path (an active board, columns, labeled/assigned/due cards, checklists, comments)
- an **empty** column (`Blocked`)
- an **overdue** card
- an **archived** card
- an **archived board** ("Q1 Retro (closed)")
- a **pending** invitation and an **expired** invitation
- a **permission-restricted** state (`dave@example.com` is a real user but not a board member)

Never point `db:seed` at a database you care about — it deletes everything first.

## Tests

Three layers, each with its own isolated setup:

```bash
bun run test              # unit tests (vitest) — pure domain logic, no I/O
bun run test:integration  # integration tests against a real, isolated Postgres DB
bun run test:e2e          # Playwright browser tests covering all three user journeys
```

- **Unit** (`lib/**/__tests__`, `lib/domain/__tests__`): authorization predicates, position/reorder math, filter logic, invitation expiry rules, markdown-lite XSS safety, password hashing.
- **Integration** (`test/integration/db.test.ts`): runs against `stackboard_test`, a separate database from your dev DB. It drops and recreates the schema before each run and wipes tables between tests, so it is safe to run repeatedly but **must never point at a database with real data** — the suite refuses to start unless `DATABASE_URL` contains `stackboard_test`. Create it once with:
    ```bash
    docker exec -it <postgres-container> psql -U stackboard -d stackboard -c "CREATE DATABASE stackboard_test;"
    ```
- **End-to-end** (`test/e2e/*.spec.ts`, Playwright): builds and boots the app against your real dev database (reseeded via `global-setup.ts`), then drives a real browser through:
    1. owner creates a board, invites a teammate, adds a card with assignee/due date/checklist
    2. teammate filters to their cards, completes a checklist item, comments, and **drags** a card to Done (real pointer events, not a simulated event)
    3. owner archives a card and an empty column, reviews the activity trail, restores the card into a chosen column
    4. a non-member is denied access to the board via a direct URL (acceptance scenario)
    5. the board is usable at a 390×844 mobile viewport

Run `bun run typecheck` for a strict TypeScript pass; the project has no `any`-shaped escape hatches in application code.

## Deployment

Any Node.js host that supports Next.js App Router works (Vercel, Fly, Render, a plain VM). Checklist:

1. Provision Postgres and set `DATABASE_URL`.
2. Set `SESSION_SECRET`, `APP_URL` (your public URL), and `RESEND_API_KEY`/`EMAIL_FROM` if you want real invite emails.
3. Run `bun run db:migrate` as a release step before starting new instances.
4. `bun run build && bun run start`.
5. If you deploy to multiple instances/regions, set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` to a stable value shared across them (see Next.js's Server Actions guide) so Server Action payloads stay decryptable across instances.

## Integration setup: email (Resend)

- Without `RESEND_API_KEY`, `lib/email/adapter.ts` logs the invite email to the console instead of sending it — the invite flow is fully usable in development without any credentials.
- With a key set, the adapter sends via Resend, races the call against an 8s timeout, and normalizes provider/timeout errors into a single `EmailDeliveryError` so callers never see raw SDK exceptions.
- Invite tokens are cryptographically random, stored **hashed** (SHA-256) — the raw token only ever exists in the emailed URL and is never persisted or logged.
- Email content is HTML-escaped before interpolation (board name, inviter name, URL) to prevent injection into the outbound message.
- Failure is surfaced to the owner in the UI ("Invitation saved, but the email failed to send...") rather than silently swallowed; the invitation row still exists so it can be manually shared or the owner can retry.

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
- **File uploads and OAuth are not implemented** — they're out of scope for the three named journeys, so there's no attack surface to secure for them. If added later, uploads should go through a server-only object-storage adapter with short-lived signed URLs, per the working agreement.
- **Board import (Trello/Stackboard JSON exports)** is authenticated-only, validates and length-limits every field server-side with `zod` before insert, and creates a brand-new board scoped to the importing user — it never merges into or overwrites an existing board.
- Every user-facing form validates and length-limits input server-side with `zod`, independent of any client-side `maxLength`/`required` attributes.

## Known limitations

- **No real-time sync.** Two members viewing the same board converge only on next navigation/mutation (each Server Action calls `revalidatePath`), not via WebSockets/SSE. This satisfies "no duplicate cards after a move" but not live cross-tab updates.
- **No file attachments / object storage adapter.** Not required by the three named journeys; the brief's S3-compatible adapter guidance would apply if this is added.
- **No background job runner.** Invite emails send inline within the Server Action request. At this app's scale (small team, low invite volume) this is an acceptable trade-off instead of standing up a queue; the email adapter's timeout keeps a slow provider from hanging the request indefinitely.
- **Column reordering in Settings** uses simple up/down buttons rather than drag-and-drop, for a simpler, fully-keyboard-accessible control on a secondary screen (the board view's card drag-and-drop supports both pointer and keyboard).
- **`bun run lint`** currently fails in this environment because `typescript-eslint` doesn't yet support the TypeScript 7.0 compiler this project ships with (a preview-track dependency, not something introduced by this app) — `bun run typecheck` (plain `tsc --noEmit`) is the enforced type-safety gate instead and passes cleanly.
- **Drizzle-kit has no down-migration runner** — see the Migrations section for the rollback approach used instead.

## Roadmap and changelog

See [ROADMAP.md](./ROADMAP.md) for planned work beyond the current three
journeys, and [CHANGELOG.md](./CHANGELOG.md) for release history.
