# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Dead-code checking with [Knip](https://knip.dev)** (`bun run knip`):
  reports unused files, dependencies, and exports. `knip.json` declares two
  workspaces — without them Knip never sees Vite's `index.html` and reports
  all 15 `website/src/**` files as unused. `sharp` sits in
  `ignoreDependencies`: nothing imports it, but Next uses it at runtime for
  image optimization when self-hosting. Knip exits non-zero when it finds
  something, so it can gate CI later.

### Changed

- **`logActivity` takes the `NewActivityEvent` type** instead of re-declaring
  the same shape inline (`lib/actions/helpers.ts`), which also narrows `type`
  from `string` to `ActivityType` — the union in `lib/domain/activity.ts` now
  actually constrains what callers can log.

### Removed

- **Exports nothing imported**: `isTrelloExport` (`lib/import/trello.ts`) is
  gone — the import path uses `parseTrelloExport`, which validates anyway.
  `MAX_FILENAME_LENGTH`, `MAX_SEARCH_QUERY_LENGTH`, `MAX_WIP_LIMIT`,
  `EmailDeliveryError`, and the three `NormalizedImport*` types stay, but are
  no longer exported: each is only used inside its own module.

## [0.3.2] - 2026-08-20

### Added

- **Health endpoint** (`GET /api/health`): reports whether the app can serve,
  not just whether the process is up. Two real probes — a timed `select 1`
  against Postgres, and how long the oldest already-due job has been waiting,
  which catches a dead `worker` while `web` still answers every request.
  `status` is `ok`, `degraded`, or `down` (HTTP `200`/`200`/`503`), so a
  monitor sees failure without parsing the body. Thresholds and the
  worst-status-wins aggregation are pure logic in `lib/domain/health.ts`. The
  endpoint is unauthenticated by design (the container healthcheck calls it),
  so the body carries statuses and timings only — never error text, which
  could leak the database host or user.
- **`docs/` folder**: the README shrank to a quickstart, with the deep
  material split into `docs/deployment.md`, `docs/configuration.md`,
  `docs/architecture.md`, `docs/security.md`, and `docs/testing.md`.

### Changed

- **The `web` container no longer publishes its port to every interface**:
  `docker-compose.prod.yml` binds to `127.0.0.1` by default via the new
  `WEB_BIND`/`WEB_PORT` variables, so a deploy is never served straight to
  the internet without TLS. `WEB_BIND=0.0.0.0` remains a deliberate opt-in.
- **The `web` healthcheck hits `/api/health` instead of `/`**: a container
  could previously report `healthy` with the database unreachable, because
  the home page still returned something.
- **The development `docker-compose.yml` publishes Postgres and MinIO on
  `127.0.0.1` only**: both ship with well-known credentials, and binding them
  to every interface offered them to whatever network the machine was on.
- **Deployment docs and compose comments are platform-neutral**: guidance
  previously written against one specific PaaS now applies to any
  Docker-Compose-based host, keeping the same operational runbooks
  (`POSTGRES_PASSWORD` rotation, migrate-on-boot).
- **`.env.example` now documents every variable the stack reads**: added
  `UPLOAD_DIR` and a production-compose section (`POSTGRES_PASSWORD`,
  `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`).
- **Website feature grid refreshed**: the landing page now covers what has
  shipped since 0.1 (calendar/Gantt/analytics views, checklists, subtasks and
  dependencies, import/export, public read-only links), and the meta
  description with it.
- **Deduplicated internals**: one shared `escapeHtml` (`lib/markdown.ts`),
  one `appUrl` constant (`lib/app-url.ts`), one `REPO_URL` constant
  (`lib/repo.ts`), one brand-mark component for the icon/OG metadata routes
  (`app/_components/brand-mark.tsx`), and the leftover `deckClient` global
  renamed.

### Fixed

- **Website logo was invisible in dark mode**: the nav's dark variant pointed
  at `logo-white.svg`, which is named for a white _background_ — its ink is
  all black. It now uses `logo-color-dark.svg` (blue mark, white wordmark),
  the same fix the app shipped in 0.3.1, and the README header gained the
  equivalent `<picture>` swap for GitHub's dark theme.
- **`/boards/changelog` crashed inside the Docker image**: the standalone
  build never included `CHANGELOG.md`, so the route threw ENOENT at request
  time. The runner stage now copies the file next to the server.
- **The in-app changelog truncated every wrapped entry**: the parser kept
  only a bullet's first physical line. Continuation lines now fold back in,
  bullets render through the escape-first `renderMarkdownLite` instead of an
  unescaped formatter, and release headings display without literal brackets.
- **The website presented unreleased work as "Recently shipped"**: its
  build-time changelog reader now skips the `[Unreleased]` block.
- **CI's e2e job pointed `APP_URL` at port 3000** while Playwright boots the
  app on 3100 — nothing was listening there.
- **The website never loaded Inter**: `src/index.css` declared it as the body
  face but the Google Fonts request didn't include it, so body text silently
  fell back to system fonts.
- **The Open Graph image drew near-black text on the brand blue gradient**;
  the text is now white.
- **`vitest.integration.config.ts` still used `__dirname`**: the ESM-config
  fix 0.3.0 documented had only been applied to the unit config. Renamed to
  `.mts` with `fileURLToPath`, matching `vitest.config.mts`.
- **Missing dark values** for `--color-primary-soft`, `--color-brand-magenta`,
  and `--color-board-blue`, which DESIGN.md requires for every token.

### Removed

- **`screenshot.png`**: the README screenshot showed a v0.1.0 build with the
  "All rights reserved" footer that 0.3.1 replaced with the MIT License link.
  Removed until a current capture replaces it.

## [0.3.1] - 2026-08-19

### Fixed

- **Dark mode lost the brand blue in the logo**: the dark-mode wordmark was
  `logo-black.svg`, which is white throughout — including the rounded symbol,
  so the blue mark turned into a plain white square. Added
  `public/logos/logo-color-dark.svg` (blue symbol, white wordmark) and pointed
  the sidebar and privacy page at it.
- **Board tile titles were unreadable in dark mode**: `--color-carbon` had no
  dark value, so titles stayed near-black on top of the deep tint the tile
  header flips to. Same omission for `--color-brand-dark`, `--color-ash`,
  `--color-ruby`, `--color-leaf`, and `--color-label-blue`. Every token now
  carries a dark value, as `DESIGN.md` already required.
- **White-on-blue and white-on-red dropped below WCAG AA in dark mode**: the
  primary button rendered white on a lightened blue (3.85:1) and the
  unread-count badges white on the lightened coral (2.77:1). Both tokens are
  _surfaces_ under white text, not text colors, so they no longer lighten in
  dark: `--color-midnight` stays `#1868db` (5.2:1) and badges use a new
  `--color-coral-solid` (`#dc2626`, 4.8:1). Blue and red used _as text or
  icons_ still lighten via `--color-electric-blue` / `--color-coral`.
- **Muted avatars (members not on the current board) read as smudges in dark
  mode**: they now use a dedicated `--color-avatar-muted` /
  `--color-avatar-muted-ink` pair tuned per theme (6.4:1 in dark).
- **Login/signup links hovered into an unreadable blue**: they used
  `--color-midnight-pressed` (a button-surface token) as a text color. They
  keep the link blue and underline on hover instead.

### Changed

- **App footer reworked** (`app/boards/layout.tsx`): one dense line —
  identity and version grouped left behind hairline dividers, authorship
  links pushed right — and it now says **MIT License** (linked to `LICENSE`)
  instead of "All rights reserved", which contradicted the license the
  project ships under. The GitHub mark moved to a shared
  `app/_components/github-icon.tsx`.
- **`DESIGN.md` documents the surface-blue vs. text-blue rule** these
  contrast bugs came from, plus the new tokens.

## [0.3.0] - 2026-08-19

### Added

- **Self-hosted deployment support**: a production `Dockerfile` (bun build
  stages, `node:22-alpine` runtime, non-root user, standalone Next.js output)
  and `docker-compose.prod.yml` running `web`, `worker`, Postgres, and MinIO
  as containers on one host — deployable to any Docker-Compose-based platform
  (verified on a Coolify deploy). Migrations run automatically as part of the
  `web` container's own boot command rather than a separate deploy-hook step,
  so a container can never start serving requests against an unmigrated
  database.
- **S3-compatible object storage** (`lib/storage/s3.ts`): attachments go to
  an S3-compatible endpoint (MinIO in production) when `S3_ENDPOINT` is
  configured, implementing the same `ObjectStorage` interface as the
  local-disk adapter with no caller changes (`lib/storage/index.ts` picks
  between them). Falls back to local disk when unset, so local dev needs no
  S3 setup.
- **Board-level activity history** (`/boards/:boardId/activity`): every event
  on a board, not just one card's, reusing the existing `activity_board_idx`
  index (`lib/queries/activity.ts#listBoardActivity`). Linked from a new
  header icon, rendered with a per-event-type icon.
- **Attachment previews**: image attachments show an inline thumbnail, and
  both images and PDFs can be expanded into a full inline preview
  (`<img>`/`<iframe>`) from the card's attachments list without downloading.
  The attachment route serves images/PDFs with
  `Content-Disposition: inline` instead of `attachment` (everything else
  still forces a download).
- **Saved filtered views**: save the board's current filter combination under
  a name and reapply it later as a chip next to the filter bar
  (`app/boards/[boardId]/saved-views.tsx`). Per-browser via `localStorage`,
  no schema change.
- **Search now covers boards and comments**, not just card
  titles/descriptions (`lib/queries/search.ts`). `/boards/search` groups
  results into Boards / Cards / Comments sections.
- **Board calendar** (`/boards/:boardId/calendar`): a Monday-first monthly
  grid of active cards plotted by due date, with month navigation
  (`?month=YYYY-MM`) and a priority-colored dot per card
  (`lib/domain/calendar.ts`, unit-tested). Linked from a new header icon.
- **Board analytics** (`/boards/:boardId/analytics`): active/overdue/archived
  counts, checklist completion, and bar breakdowns of cards by column, by
  priority, and load per member — all computed live from current rows, no new
  tables (`lib/domain/analytics.ts`, unit-tested).
- **Linked subtasks**: a card can carry a `parentCardId` pointing at another
  card on the same board. The card detail page shows a "Subtask of …"
  breadcrumb, a subtasks list with a done/total progress bar
  (`lib/domain/subtasks.ts`, unit-tested), and an inline "add subtask" form
  that creates the child in the parent's own column.
- **Card dependencies**: a new `card_dependencies` table records directed
  "blocks"/"blocked by" edges between two cards on a board. The card detail
  page lists both directions and can add/remove a blocker; adding one that
  would create a cycle is rejected server-side
  (`lib/domain/dependencies.ts#wouldCreateCycle`, unit-tested).
- **Board timeline / Gantt view** (`/boards/:boardId/gantt`): active cards
  with a start and/or due date (`cards.startDate` is new) render as
  horizontal bars per column, positioned by pure layout math
  (`lib/domain/gantt.ts`, unit-tested). A translucent line marks today, and a
  lock icon flags a card still blocked by another active card. Cards with
  neither date are excluded and counted in a footnote.
- **Card templates**: creating a card can seed it from a built-in template
  (Bug report, Feature request, Task) that inserts starter checklist items
  (and, for Bug report, a default priority) alongside the normal insert
  (`lib/templates/cards.ts`).
- **Public read-only board links**: a board owner can turn on a share link
  from Settings; the link (`/p/:token`) needs no login and renders
  columns/cards read-only — no assignees, comments, activity, or attachments
  (`lib/queries/public-board.ts`). The token is stored in plaintext by
  design: it grants only read access, is owner-revocable, and must remain
  viewable in Settings (see `docs/security.md`).

### Fixed

- **Sidebar/privacy-page logo was invisible in dark mode**: `logo-color.svg`'s
  wordmark is solid black, disappearing against the dark-mode paper
  background. Both usages now render a light/dark image pair toggled purely
  in `app/globals.css` (`.logo-light`/`.logo-dark`, matching the project's
  media-query-only dark mode) rather than a `dark:` variant in the component.
- **`.btn-ghost` was missing `display: inline-flex`/`gap`**
  (`app/globals.css`), the layout every other button variant has — an icon +
  label ghost button would stack the icon above the text.
- **`SavedViews` read `localStorage` via `useState` + `useEffect`**, which
  `eslint-plugin-react-hooks` flags. Rewritten on `useSyncExternalStore` —
  localStorage is genuinely an external store, and writes from this tab now
  update the UI without a render round-trip.
- **Root ESLint config linted the marketing site with Next-specific rules**:
  `website/` is a separate Vite project with its own `oxlint` toolchain, so
  `eslint.config.mjs` now ignores `website/**` entirely.
- **`vitest.config.ts` warned under Vite's upcoming native config loader**
  ("ESM syntax in a file loaded as CommonJS"). Renamed to `vitest.config.mts`
  to make it unambiguously ESM, replacing `__dirname` with
  `fileURLToPath(import.meta.url)`.

## [0.2.0] - 2026-08-09

### Added

- **Custom board labels**: create, recolor, and delete labels from Settings
  (`lib/actions/labels.ts`), each change recorded in the activity trail.
- **Board background colors**: pick one of six palette colors per board from
  Settings → Appearance; boards without a choice keep the previous stable
  per-id tint (`lib/board-colors.ts`).
- **Board list view**: a compact, non-drag alternative to the kanban board,
  toggled per-board via a header control and the `?view=list` query param.
- **Public marketing website** (`website/`, Vite + React): hero, features,
  board preview, and repo links for the open-source release. Deployed
  separately from the app, so it needs no DB or session infrastructure.
- **Real-time board sync** over Server-Sent Events: `/boards/:boardId/events`
  watermark-polls the activity trail and connected members' boards refresh
  automatically — no reload needed to see a teammate's move.
- **Notifications**: in-app notification center (`/boards/notifications`,
  unread badge in the sidebar) plus emails via the existing job queue. Covers
  card assignment, comments on watched/assigned cards, @mentions, and
  due-soon reminders (hourly worker scan, deduplicated per card via
  `due_reminder_sent_at`).
- **@mentions in comments**: `@name` (first name or email local part, active
  members only) highlights in the comment and notifies the mentioned member.
- **Card watchers**: watch/unwatch any card to receive its notifications;
  assignees start watching automatically.
- **Observer role**: read-only board membership. Observers see everything but
  every content mutation is rejected server-side (`requireContentEditor`);
  invitations now carry a role (member/observer).
- **WIP limits per column**: an optional limit (Settings, owner-only) blocks
  new/moved/restored cards from entering a full column and turns the column
  counter red when over.
- **Card priority** (Jira-style: Highest → Lowest, optional): set on the card
  detail page, shown as a colored chevron on the board card, and filterable
  from the board's filter bar (`lib/priority.ts`).
- **Card search** (`/boards/search`): Postgres full-text
  (`websearch_to_tsquery` over a GIN expression index) with ILIKE fallback,
  scoped to boards where the caller is an active member.
- **My cards** (`/boards/my-cards`): every card assigned to you across
  boards, bucketed by due date (overdue / today / this week / later / none).
- **Board templates**: Basic Kanban, Weekly sprint, and Bug tracking, reusing
  the import pipeline's transactional insert path.
- **File attachments** on cards: server-only object-storage adapter
  (local disk at this point, S3-compatible later), 10MB cap, sanitized
  filenames, authenticated streaming downloads, uploader/owner-only delete.
- **CI**: GitHub Actions workflow (lint, typecheck, unit tests, build;
  integration tests against a Postgres service container; Playwright e2e).
- **Dark-mode token coverage**: subtle label fills, status colors, overlays,
  and shadows now all have dark values in `app/globals.css`.
- **Board import**: from a Trello board export, a Stackboard board export
  (JSON), or a Stackboard CSV export, creating a new board with columns,
  cards, labels, checklists, and comments.
- **Board export**: as JSON or CSV (`/boards/:boardId/export`,
  `?format=csv`), authenticated and membership-scoped.
- **Background job queue**: Postgres-backed (`jobs` table) with a polling
  worker (`bun run db:jobs:work`), retries with exponential backoff, and a
  `send_invite_email` handler.
- **Project documentation**: `ROADMAP.md` and this changelog.

### Changed

- **Label palette reworked** from a blue-only gamut to six real,
  distinguishable hues (blue/purple/green/yellow/red/orange) — the one
  sanctioned decorative exception to the blue/gray design system (see
  DESIGN.md). Board tiles and kanban column accent dots derive from the same
  palette.
- **`PriorityIcon` default size increased** 14px → 20px for legibility on the
  card detail header.
- **Seed data expanded** with more users and a second board to exercise
  labels and board colors alongside the existing scenarios.
- **Footer version number reads from `package.json`** instead of being
  hardcoded, and the static "All systems operational" status line was
  removed.
- **App shell rebuilt around the new sections**: sidebar navigation (Boards,
  My cards, Search, Notifications) with an active-route state, a header
  notification bell and settings shortcut, and an account dropdown menu. The
  sidebar is hidden below `md`, where the header icons and a new footer nav
  carry navigation instead.
- **Unread notification count shared over one per-user SSE subscription**
  (`notifications-live.tsx`), so the header bell and sidebar badge update
  live without polling from several components.
- **Toolchain**: TypeScript is installed side by side — `typescript` 6.x for
  the API JS tools import, TypeScript 7 as `@typescript/native` providing the
  `tsc` used by `bun run typecheck` — and ESLint is pinned to 9.x. `bun run
lint` works again and is now a CI gate (details in
  `docs/architecture.md`, Known limitations).
- **Transitive dependencies pinned** (`nanoid`, `postcss`, `esbuild`,
  `sharp`) through `overrides` in `package.json` to versions without known
  advisories.
- **Column reordering in Settings is now drag-and-drop** (`@dnd-kit`),
  mirroring the board view's card drag, with full keyboard support. Replaces
  the previous up/down buttons.
- **Invite emails moved to the background job worker** instead of inline
  within the `inviteMemberAction` Server Action request, so a slow/failing
  email no longer holds up the response.
- **Refined `FilterBar`, `BoardsLayout`, and card detail page styling** for
  visual consistency.

## [0.1.0] - 2026-08-01

### Added

- **Boards** with ordered columns and drag-and-drop cards (`@dnd-kit`).
- **Card details**: assignee, due date, labels, checklists, and comments.
- **Activity trail** per card and reversible archiving for cards and columns.
- **Board membership and invitations**, including pending/expired invite
  states and a permission-restricted (non-member) view.
- **Email/password authentication** with scrypt password hashing and
  DB-backed, revocable sessions (httpOnly, `sameSite=lax` cookies).
- **Invite emails via Resend**, with a console-logging fallback in
  development when `RESEND_API_KEY` is unset.
- **Postgres schema and migrations** via Drizzle ORM, plus a seed script
  covering the happy path, empty/overdue/archived states, and permission edge
  cases.
- **Filters** for the board view (assignee, label, overdue).
- **Hand-rolled `renderMarkdownLite`** for card descriptions/comments that
  escapes all input before formatting, avoiding injected HTML.
- **Test suite**: unit tests (Vitest) for domain logic, integration tests
  against an isolated Postgres database, and Playwright end-to-end tests
  covering all three user journeys plus a mobile viewport check.

[Unreleased]: https://github.com/creativoma/stackboard/compare/v0.3.2...HEAD
[0.3.2]: https://github.com/creativoma/stackboard/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/creativoma/stackboard/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/creativoma/stackboard/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/creativoma/stackboard/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/creativoma/stackboard/releases/tag/v0.1.0
