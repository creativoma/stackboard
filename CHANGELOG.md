# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Board import from a Trello board export, a Stackboard board export (JSON), or a Stackboard CSV export, creating a new board with columns, cards, labels, checklists, and comments.
- Board export as JSON or CSV (`/boards/:boardId/export`, `?format=csv`), authenticated and membership-scoped.
- Postgres-backed background job queue (`jobs` table) with a polling worker (`bun run db:jobs:work`), retries with exponential backoff, and a `send_invite_email` handler.
- Project documentation: `ROADMAP.md` and this changelog.

### Changed

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

[Unreleased]: https://github.com/creativoma/stackboard/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/creativoma/stackboard/releases/tag/v0.1.0
