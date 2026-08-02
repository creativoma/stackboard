# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Board import from a Trello board export or a Stackboard board export (JSON), creating a new board with columns, cards, labels, checklists, and comments.
- Board export as JSON (`/boards/:boardId/export`), authenticated and membership-scoped.
- Project documentation: `ROADMAP.md` and this changelog.

### Changed

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
