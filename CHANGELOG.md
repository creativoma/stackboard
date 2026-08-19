# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1] - 2026-08-19

### Fixed

- **Dark mode lost the brand blue in the logo**: the dark-mode wordmark was
  `logo-black.svg`, which is white throughout — including the rounded symbol,
  so the blue mark turned into a plain white square. Added
  `public/logos/logo-color-dark.svg` (blue symbol, white wordmark) and pointed
  the sidebar and privacy page at it.
- **Board tile titles were unreadable in dark mode**: `--color-carbon` had no
  dark value, so titles stayed near-black (`#171717`) on top of the deep tint
  the tile header flips to. Same omission for `--color-brand-dark`,
  `--color-ash`, `--color-ruby`, `--color-leaf`, and `--color-label-blue` —
  the one label solid that wasn't lightened alongside its five siblings. Every
  token now carries a dark value, as `DESIGN.md` already required.
- **White-on-blue and white-on-red dropped below WCAG AA in dark mode**: the
  primary button rendered white on `#3b82e0` (3.85:1) and the unread-count
  badges white on the lightened coral (2.77:1). Both tokens are _surfaces_
  under white text, not text colors, so they no longer lighten in dark:
  `--color-midnight` stays `#1868db` (5.2:1) with its hover/pressed states
  moving the same way they do in light, and badges use a new
  `--color-coral-solid` (`#dc2626`, 4.8:1). Blue and red used _as text or
  icons_ still lighten via `--color-electric-blue` / `--color-coral`.
- **Muted avatars (members not on the current board) read as smudges in dark
  mode**: link-blue initials on a translucent blue tint, with a `paper` ring
  that vanishes against the dark canvas. They now use a dedicated
  `--color-avatar-muted` / `--color-avatar-muted-ink` pair tuned per theme
  (6.4:1 in dark).
- **Login/signup links hovered into an unreadable blue**: they used
  `--color-midnight-pressed` as a text color, which is a button-surface token;
  with the contrast fix above it became a dark navy on the dark background.
  They keep the link blue and underline on hover instead.

### Changed

- **App footer reworked** (`app/boards/layout.tsx`): the three-part
  `justify-between` row became one dense line — identity and version grouped
  left behind hairline dividers, authorship links pushed right — and it now
  says **MIT License** (linked to `LICENSE`) instead of "All rights reserved",
  which contradicted the license the project actually ships under. The GitHub
  mark moved to a shared `app/_components/github-icon.tsx`.
- `DESIGN.md` documents the surface-blue vs. text-blue rule that these
  contrast bugs came from, plus the new tokens.

## [0.3.0] - 2026-08-19

### Added

- **Self-hosted deployment support (Coolify)**: a production `Dockerfile`
  (bun build stages, `node:22-alpine` runtime, non-root user, standalone
  Next.js output) and `docker-compose.prod.yml` running `web`, `worker`,
  Postgres, and MinIO as containers on one host. Migrations run
  automatically as part of the `web` container's own boot command
  (`cd /drizzle-cli && drizzle-kit migrate && exec node server.js`) rather
  than a separate deploy-hook step, so a container can never start serving
  requests against an unmigrated database.
- **S3-compatible object storage** (`lib/storage/s3.ts`): attachments go to
  an S3-compatible endpoint (MinIO in production) when `S3_ENDPOINT` is
  configured, implementing the same `ObjectStorage` interface as the local-disk
  adapter with no caller changes (`lib/storage/index.ts` picks between them).
  Falls back to local disk when unset, so local dev needs no S3 setup.
- **Board-level activity history** (`/boards/:boardId/activity`): every
  event on a board, not just one card's, reusing the existing
  `activity_board_idx` index (`lib/queries/activity.ts#listBoardActivity`).
  Linked from a new header icon on the board page, rendered as a bordered,
  hairline-divided list with a per-event-type icon (moved, archived,
  commented, …) — the same container pattern as "My cards".
- **Attachment previews**: image attachments (`mime_type` starting with
  `image/`) show an inline thumbnail, and both images and PDFs (`FileText`
  icon for the latter) can be expanded into a full inline preview
  (`<img>`/`<iframe>`) from the card's attachments list without downloading.
  The attachment route now serves images/PDFs with `Content-Disposition:
inline` instead of `attachment` (everything else still forces a download).
- **Saved filtered views**: save the board's current filter combination
  under a name and reapply it later as a chip next to the filter bar
  (`app/boards/[boardId]/saved-views.tsx`). Per-browser via `localStorage`,
  no schema change.
- **Search now covers boards and comments**, not just card titles/descriptions
  (`lib/queries/search.ts#searchBoards`/`searchComments`). `/boards/search`
  groups results into Boards / Cards / Comments sections.
- **Board calendar** (`/boards/:boardId/calendar`): a Monday-first monthly
  grid of active cards plotted by due date, with month navigation
  (`?month=YYYY-MM`) and a priority-colored dot per card
  (`lib/domain/calendar.ts`, unit-tested). Linked from a new header icon.
- **Board analytics** (`/boards/:boardId/analytics`): active/overdue/archived
  counts, checklist completion, and bar breakdowns of cards by column, by
  priority, and load per member — all computed live from current rows, no
  new tables (`lib/domain/analytics.ts`, unit-tested). Linked from a new
  header icon.
- **Linked subtasks**: a card can carry a `parentCardId` pointing at another
  card on the same board (`db/schema.ts#cards`). The card detail page shows
  a "Subtask of …" breadcrumb, a subtasks list with a done/total progress
  bar (`lib/domain/subtasks.ts`, unit-tested), and an inline "add subtask"
  form that creates the child in the parent's own column
  (`lib/actions/subtasks.ts`).
- **Card dependencies**: a new `card_dependencies` table records directed
  "blocks"/"blocked by" edges between two cards on a board. The card detail
  page lists both directions and can add/remove a blocker from a picker of
  the board's other active cards; adding one that would create a cycle is
  rejected server-side (`lib/domain/dependencies.ts#wouldCreateCycle`,
  unit-tested) (`lib/actions/dependencies.ts`).
- **Board timeline / Gantt view** (`/boards/:boardId/gantt`): active cards
  with a start and/or due date (`cards.startDate` is new) render as
  horizontal bars per column, positioned by pure layout math
  (`lib/domain/gantt.ts`, unit-tested). A translucent line marks today, and
  a lock icon flags a card still blocked by another active card, reusing
  the dependency data above. Cards with neither date are excluded and
  counted in a footnote.
- **Card templates**: creating a card can seed it from a built-in template
  (Bug report, Feature request, Task) that inserts starter checklist items
  (and, for Bug report, a default priority) alongside the normal insert —
  no new transactional path (`lib/templates/cards.ts`,
  `lib/actions/cards.ts#createCardAction`).
- **Public read-only board links**: a board owner can turn on a share link
  from Settings (`app/boards/[boardId]/settings/public-link-form.tsx`); the
  link (`/p/:token`) needs no login and renders columns/cards read-only —
  no assignees, comments, activity, or attachments
  (`lib/queries/public-board.ts`). The token is a new `boards.publicToken`
  column, stored in plaintext by design (see README Security decisions).

### Fixed

- **Sidebar/privacy-page logo was invisible in dark mode**: `logo-color.svg`'s
  wordmark is solid black, disappearing against the dark-mode paper
  background. Both usages now render a light/dark image pair toggled purely
  in `app/globals.css` (`.logo-light`/`.logo-dark`, matching the project's
  media-query-only dark mode) rather than a `dark:` variant in the component.
- **`.btn-ghost` was missing `display: inline-flex`/`gap`** (`app/globals.css`),
  the layout every other button variant has. An icon + label ghost button
  (e.g. "Save view") would stack the icon above the text instead of sitting
  inline. Every other button variant already had it; ghost just hadn't been
  exercised with an icon before.
- **`SavedViews` read `localStorage` via `useState` + `useEffect`**, which
  `eslint-plugin-react-hooks`'s `set-state-in-effect` rule flags (calling
  `setState` synchronously in an effect body). Rewritten on
  `useSyncExternalStore` instead (`app/boards/[boardId]/saved-views.tsx`) —
  localStorage is genuinely an external store, so this is also the more
  correct API for it, and writes from this tab now update the UI without a
  render round-trip.
- **Root ESLint config only ignored `website/dist/**`**, so the marketing
  site's source (a separate Vite project with its own `oxlint` toolchain,
  see `website/package.json`) was linted with Next-specific rules that
  don't apply to it, e.g. `@next/next/no-img-element` flagging a plain
  `<img>` that has no `next/image` to switch to. `eslint.config.mjs` now
  ignores `website/**` entirely.
- **`vitest.config.ts` warned under Vite's upcoming native config loader**
  ("ESM syntax in a file loaded as CommonJS") because the root
  `package.json` has no `"type": "module"` and the file used a plain `.ts`
  extension. Renamed to `vitest.config.mts` to make it unambiguously ESM —
  same fix already applied to `eslint.config.mjs`. That flip also removes
  `__dirname` (a CommonJS global, not available in an ESM file), replaced
  with `path.dirname(fileURLToPath(import.meta.url))`.

## [0.2.0] - 2026-08-09

### Added

- **Custom board labels**: create, recolor, and delete labels from Settings (`lib/actions/labels.ts`), each change recorded in the card/board activity trail.
- **Board background colors**: pick one of six palette colors per board from Settings → Appearance (`db/schema.ts#boards.color`); boards without a choice keep the previous stable per-id tint (`lib/board-colors.ts`).
- **Board list view**: a compact, non-drag alternative to the kanban board (`app/boards/:boardId/board-list.tsx`), toggled per-board via a header control and the `?view=list` query param.
- **Public marketing website** (`website/`, Vite + React): hero, features, board preview, and repo links for the open-source release. Deployed separately from the app, so it needs no DB or session infrastructure.
- **Real-time board sync** over Server-Sent Events: `/boards/:boardId/events` watermark-polls the activity trail and connected members' boards refresh automatically — no reload needed to see a teammate's move.
- **Notifications**: in-app notification center (`/boards/notifications`, unread badge in the sidebar) plus emails via the existing job queue (`send_notification_email`). Covers card assignment, comments on watched/assigned cards, @mentions, and due-soon reminders (hourly worker scan, deduplicated per card via `due_reminder_sent_at`).
- **@mentions in comments**: `@name` (first name or email local part, active members only) highlights in the comment and notifies the mentioned member.
- **Card watchers**: watch/unwatch any card to receive its notifications; assignees start watching automatically.
- **Observer role**: read-only board membership. Observers see everything but every content mutation is rejected server-side (`requireContentEditor`); invitations now carry a role (member/observer).
- **WIP limits per column**: optional limit (Settings, owner-only) blocks new/moved/restored cards from entering a full column and turns the column counter red when over.
- **Card priority** (Jira-style: Highest → Lowest, optional): set on the card detail page, shown as a colored chevron on the board card, and filterable from the board's filter bar (`lib/priority.ts`, `app/_components/priority-icon.tsx`).
- **Card search** (`/boards/search`): Postgres full-text (`websearch_to_tsquery` over a GIN expression index) with ILIKE fallback, scoped to boards where the caller is an active member.
- **My cards** (`/boards/my-cards`): every card assigned to you across boards, bucketed by due date (overdue / today / this week / later / none).
- **Board templates**: Basic Kanban, Weekly sprint, and Bug tracking, reusing the import pipeline's transactional insert path.
- **File attachments** on cards: server-only object-storage adapter (local disk under `UPLOAD_DIR` today, S3-compatible later), 10MB cap, sanitized filenames, authenticated streaming downloads, uploader/owner-only delete.
- **CI**: GitHub Actions workflow (lint, typecheck, unit tests, build; integration tests against a Postgres service container; Playwright e2e).
- Dark-mode token coverage: subtle label fills, status colors, overlays, and shadows now all have dark values in `app/globals.css`.
- Board import from a Trello board export, a Stackboard board export (JSON), or a Stackboard CSV export, creating a new board with columns, cards, labels, checklists, and comments.
- Board export as JSON or CSV (`/boards/:boardId/export`, `?format=csv`), authenticated and membership-scoped.
- Postgres-backed background job queue (`jobs` table) with a polling worker (`bun run db:jobs:work`), retries with exponential backoff, and a `send_invite_email` handler.
- Project documentation: `ROADMAP.md` and this changelog.

### Changed

- **Label palette reworked** from a blue-only gamut to six real, distinguishable hues (blue/purple/green/yellow/red/orange) — the one sanctioned decorative exception to the blue/gray design system (see DESIGN.md). Board tiles and kanban column accent dots now derive from the same palette.
- `PriorityIcon` default size increased 14px → 20px for legibility on the card detail header.
- Seed data expanded with more users and a second board to exercise labels and board colors alongside the existing scenarios.
- Footer version number now reads from `package.json` instead of being hardcoded, and the static "All systems operational" status line was removed.
- **App shell rebuilt around the new sections**: sidebar navigation (Boards, My cards, Search, Notifications) with an active-route state, a header notification bell and settings shortcut, and an account dropdown menu replacing the inline avatar/logout row. The sidebar is hidden below `md`, where the header icons, the account menu, and a new footer nav carry navigation instead.
- The unread notification count is shared through one per-user SSE subscription (`notifications-live.tsx`), so the header bell and sidebar badge update live without polling from several components.
- **Toolchain**: TypeScript is installed side by side — `typescript` 6.x for the API JS tools import, TypeScript 7 as `@typescript/native` providing the `tsc` used by `bun run typecheck` — and ESLint is pinned to 9.x. `bun run lint` works again and is now a CI gate. See Known limitations in the README.
- Transitive dependencies (`nanoid`, `postcss`, `esbuild`, `sharp`) are pinned through `overrides` in `package.json` to versions without known advisories.
- Column reordering in Settings is now drag-and-drop (`@dnd-kit`), mirroring the board view's card drag, with full keyboard support. Replaces the previous up/down buttons.
- Invite emails are now sent by the background job worker instead of inline within the `inviteMemberAction` Server Action request, so sending a slow/failing email no longer holds up the response.
- Refined `FilterBar`, `BoardsLayout`, and card detail page styling for visual consistency.

## [0.1.0] - 2026-08-01

### Added

- Boards with ordered columns and drag-and-drop cards (`@dnd-kit`).
- Card details: assignee, due date, labels, checklists, and comments.
- Activity trail per card and reversible archiving for cards and columns.
- Board membership and invitations, including pending/expired invite states
  and a permission-restricted (non-member) view.
- Email/password authentication with scrypt password hashing and
  DB-backed, revocable sessions (httpOnly, `sameSite=lax` cookies).
- Invite emails via Resend, with a console-logging fallback in development
  when `RESEND_API_KEY` is unset.
- Postgres schema and migrations via Drizzle ORM, plus a seed script
  covering the happy path, empty/overdue/archived states, and permission
  edge cases.
- Filters for the board view (assignee, label, overdue).
- Hand-rolled `renderMarkdownLite` for card descriptions/comments that
  escapes all input before formatting, avoiding injected HTML.
- Test suite: unit tests (Vitest) for domain logic, integration tests
  against an isolated Postgres database, and Playwright end-to-end tests
  covering all three user journeys plus a mobile viewport check.

[Unreleased]: https://github.com/creativoma/stackboard/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/creativoma/stackboard/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/creativoma/stackboard/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/creativoma/stackboard/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/creativoma/stackboard/releases/tag/v0.1.0
