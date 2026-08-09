# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/creativoma/stackboard/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/creativoma/stackboard/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/creativoma/stackboard/releases/tag/v0.1.0
