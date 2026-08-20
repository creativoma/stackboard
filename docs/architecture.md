# Architecture notes

Feature-by-feature notes on how Stackboard is put together. For the map of
where code lives, see `AGENTS.md`; for the design system, see `DESIGN.md`.

## Real-time sync

Boards sync live over Server-Sent Events: `app/boards/[boardId]/events/route.ts`
authenticates the member, then watermark-polls the board's activity trail (2s
interval, backed by the existing `activity_board_idx`) and emits an event
whenever something new lands; the client (`board-live.tsx`) responds with
`router.refresh()`. No WebSocket server, no LISTEN/NOTIFY plumbing, no shared
in-process state — it behaves identically on one VM or many instances.
Changes that don't write activity (same-column card reorders) still converge
on the next navigation/mutation.

## Background jobs

Invite emails are sent by a Postgres-backed job queue instead of inline within
the Server Action request:

- `inviteMemberAction` (`lib/actions/invitations.ts`) enqueues a
  `send_invite_email` job via `lib/jobs/queue.ts` and returns immediately —
  the invitation row and job are both written before the response goes out, so
  an invite is never lost even if no worker is running yet. Notification
  emails work the same way (`send_notification_email`, fanned out by
  `lib/notifications/create.ts`).
- `bun run db:jobs:work` (`db/jobs-worker.ts`) polls the `jobs` table every
  2s, claims due rows with `SELECT ... FOR UPDATE SKIP LOCKED` (safe with
  multiple worker processes), and dispatches by `type` to a handler in
  `lib/jobs/handlers.ts`. A failed job is retried with exponential backoff
  (capped at 60s) up to 5 attempts, then marked `failed` with the error
  recorded on the row.
- The same worker also runs an hourly **due-soon scan** (`scanDueSoonCards` in
  `lib/jobs/worker.ts`): active cards due within 24h are claimed atomically
  via `due_reminder_sent_at IS NULL`, so assignee + watchers get exactly one
  reminder even with several workers running.
- Run the worker alongside the app in any environment that can host a
  long-lived process (a second container/dyno, a systemd service, etc.) —
  there's no separate queue service to stand up.
- `lib/email/send.ts` has no `server-only` import (unlike most server code in
  this app) specifically so the worker — a plain `tsx` script outside Next's
  server bundling — can import it directly; `lib/email/adapter.ts` re-exports
  it with the guard for use inside Next Server Actions.

## Email (Resend)

- Without `RESEND_API_KEY`, `lib/email/send.ts` logs the invite email to the
  console instead of sending it — the invite flow is fully usable in
  development without any credentials.
- With a key set, it sends via Resend, races the call against an 8s timeout,
  and normalizes provider/timeout errors into a single `EmailDeliveryError` so
  callers never see raw SDK exceptions.
- Invite tokens are cryptographically random, stored **hashed** (SHA-256) —
  the raw token only ever exists in the emailed URL and is never persisted or
  logged.
- Email content is HTML-escaped before interpolation (board name, inviter
  name, URL) to prevent injection into the outbound message.
- Sending happens out of the request path — see Background jobs above.

## Attachments

Cards accept file attachments (10MB cap, validated server-side in
`lib/domain/attachments.ts`). Bytes go through a server-only `ObjectStorage`
adapter (`lib/storage/adapter.ts`) with server-generated keys
(`boardId/attachmentId` — user filenames never touch the storage key).
`lib/storage/index.ts` picks the S3-compatible implementation
(`lib/storage/s3.ts`, MinIO in production — see `S3_ENDPOINT` in
[configuration.md](./configuration.md)) when configured, falling back to
local disk under `UPLOAD_DIR` (`lib/storage/local.ts`) otherwise. Downloads
stream through an authenticated route that re-checks board membership on
every request. Image attachments (`mime_type` starting with `image/`) render
an inline thumbnail, and both images and PDFs can be expanded into a full
preview (`<img>`/`<iframe>`) without leaving the card — the route serves
those two types with `Content-Disposition: inline` and everything else with
`attachment`.

## Search

`/boards/search` searches three things at once, scoped to boards the caller
actively belongs to: card titles/descriptions (Postgres full-text via
`cards_search_idx`, ILIKE fallback), board names, and comment bodies
(`lib/queries/search.ts`). Results render as three sections (Boards / Cards /
Comments), only shown when non-empty. Board/comment search is a plain `ILIKE`
scan — see `ROADMAP.md` if that needs an index later.

## Activity and saved views

- **Per-card activity** shows on each card's detail page; **board-wide
  activity** (`/boards/:boardId/activity`) lists every event across the board,
  most recent first, backed by the existing `activity_board_idx` index — no
  extra query cost beyond dropping the `card_id` filter.
- **Saved filtered views**: the board's filter bar writes its state to the URL
  query string; `app/boards/[boardId]/saved-views.tsx` lets a member name and
  re-apply a combination, stored in `localStorage` per board — no schema
  change, and not shared between browsers or teammates.

## Calendar and analytics

- **Calendar** (`/boards/:boardId/calendar`): a Monday-first monthly grid of
  active cards by due date, navigable via `?month=YYYY-MM`. Grid geometry and
  date-bucketing are pure functions in `lib/domain/calendar.ts` (unit-tested)
  so the month-boundary math (padding to full weeks, leap years, month
  rollover) never touches a component.
- **Analytics** (`/boards/:boardId/analytics`): active/overdue/archived
  counts, checklist completion, and cards-by-column / cards-by-priority /
  load-per-member breakdowns as CSS bar lists — all computed live from
  `getActiveColumnsWithCards` with no new tables or chart library.
  `lib/domain/analytics.ts` (unit-tested) holds the tallying; there's no
  historical snapshot table, so this is a live snapshot, not a true
  burndown-over-time chart (see `ROADMAP.md`).

## Subtasks and dependencies

- **Linked subtasks**: `cards.parentCardId` is a nullable self-reference
  (`db/schema.ts`). "Add subtask" (`lib/actions/subtasks.ts#addSubtaskAction`)
  creates a new card in the parent's own column, subject to the same WIP-limit
  check as any other card. The card detail page shows a "Subtask of …"
  breadcrumb when a card has a parent, and a subtasks list with a done/total
  progress bar — done means archived, the same status Stackboard already uses
  everywhere else (`lib/domain/subtasks.ts`, unit-tested).
- **Card dependencies**: a `card_dependencies` table stores directed "blocks"
  edges. The card detail page's Dependencies section lists "Blocked by" and
  "Blocks" and can add a blocker from a picker of the board's other active
  cards. Adding an edge that would create a cycle — direct or transitive — is
  rejected server-side before the insert
  (`lib/domain/dependencies.ts#wouldCreateCycle`, a BFS over the board's
  existing edges, unit-tested).

## Timeline (Gantt)

`/boards/:boardId/gantt` plots active cards with a `startDate` and/or
`dueDate` (a card with only one renders as a single-day bar) as horizontal
bars grouped by column. All the positioning is pure percentage math
(`lib/domain/gantt.ts`, unit-tested): `deriveDateRange` spans every dated card
plus today with padding, `barLayout` clamps a bar into that range, and
`todayOffsetPct` places a translucent marker line. A lock icon flags a card
still blocked by another _active_ card, reusing the dependency edges above —
an archived (done) blocker no longer counts. Cards with neither date are
excluded and counted in a footnote rather than silently dropped. There's no
drag-to-reschedule and no dependency connector lines yet (see `ROADMAP.md`).

## Card templates

Creating a card can seed it from a built-in template (`lib/templates/cards.ts`):
Bug report, Feature request, or Task, each inserting a starter checklist (Bug
report also defaults priority to High). This reuses the normal
`createCardAction` insert path plus one bulk checklist insert — unlike board
templates (`lib/templates/boards.ts`), it doesn't need the import pipeline's
transactional path since there's only one row of fan-out.

## Public read-only board links

A board owner can turn on a share link from Settings → Public link
(`app/boards/[boardId]/settings/public-link-form.tsx`, owner-only via
`requireOwner`). The link (`/p/:token`, outside the authenticated `/boards`
layout, same pattern as `/invite/:token`) needs no account and renders active
columns and cards read-only — title, priority, due date, checklist progress.
Assignee names, comments, attachments, and the activity trail are
deliberately left out to keep the public surface minimal
(`lib/queries/public-board.ts`). Regenerating rotates the token (the old link
stops working immediately); turning it off clears `boards.publicToken`
entirely. See the token-storage tradeoff in [security.md](./security.md).

## Seed data

`bun run db:seed` **wipes all tables** in whatever database `DATABASE_URL`
points at and reloads a fixed dataset across seven boards (five active, two
archived) with distinct board colors. It exercises:

- the happy path ("Product Launch": an active board, columns,
  labeled/assigned/due cards, checklists, comments)
- an **observer** member (`grace@example.com`, on "Product Launch" and
  "Mobile App v2"), a **WIP limit** on "Marketing Website Redesign" →
  Development, **card watchers**, and **unread notifications**
- an **empty** column (`Blocked` on "Product Launch")
- **overdue** cards, an **archived** card, and two **archived boards**
  ("Q1 Retro (closed)", "2025 Roadmap (closed)")
- a **pending** invitation and an **expired** invitation (`erin@example.com`
  / `frank@example.com`)
- a **permission-restricted** state (`dave@example.com` is only a member of
  "Support Triage")
- a **fully empty board** ("New Team Onboarding" — no columns) and a
  **near-empty** board ("Support Triage")
- extra users `henry@example.com` / `ivy@example.com` spread across the newer
  boards

Never point `db:seed` at a database you care about — it deletes everything
first.

## Known limitations

- **Two TypeScript packages are installed on purpose.** ESLint's toolchain
  (`typescript-eslint`) can't run on the TypeScript 7.0 API yet, so the
  project follows the
  [side-by-side layout](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0)
  Microsoft recommends: `typescript` resolves to 6.x — the API every JS tool
  imports — while TypeScript 7 stays installed as `@typescript/native` and
  provides the `tsc` binary. So `bun run typecheck` still compiles with TS 7
  (the version of record) and `bun run lint` works. ESLint is pinned to 9.x
  for the same reason: `eslint-plugin-react`, pulled in by
  `eslint-config-next`, doesn't support ESLint 10 yet. Both pins can be
  dropped once the upstream tools catch up
  ([typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)).
  The trap: tool installers that add TypeScript as a peer (`bun create
@knip/config` did) bump the `typescript` entry to 7.x, and `bun run lint`
  then dies with "typescript-eslint does not support TS 7.0". The fix is to
  put `typescript` back to `^6.0.3` — not to touch `@typescript/native`.
- **Drizzle-kit has no down-migration runner** — to roll back, restore from a
  backup (see [deployment.md](./deployment.md)) or hand-write and apply a
  compensating SQL migration. For a single-tenant app of this size that's the
  simpler and safer path than maintaining a full down-migration story.
