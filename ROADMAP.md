# Roadmap

Stackboard covers the three original user journeys plus realtime sync,
notifications, @mentions with autocomplete, watchers, an observer role, WIP
limits, priority, search (boards, cards, and comments), board templates,
card templates, attachments (with inline image/PDF previews), custom
labels, board colors, a list view, checklists, linked subtasks, card
dependencies, board export, a "My cards" focus view, an in-app notification
center, board-wide activity history, saved filtered views, a per-board
calendar, a per-board analytics dashboard, a per-board Gantt/timeline view,
and public read-only board links (see CHANGELOG). Self-hosted deployment
(Dockerfile, Docker Compose) and S3-compatible attachment storage (MinIO)
shipped in 0.3.0. This is the list of known gaps and where the project could
go next, roughly ordered by expected value.

## Near term

- **Single-TypeScript toolchain.** Lint runs in CI today, but only because
  `typescript` 6.x is installed alongside TypeScript 7 (`@typescript/native`)
  and ESLint is pinned to 9.x. Drop both pins once `typescript-eslint` runs on
  the TypeScript 7 API and `eslint-plugin-react` supports ESLint 10.
- **Build the deploy image in CI, not on the deploy host.** With
  `docker-compose.prod.yml` as shipped, the host runs `docker compose build`
  on the same machine serving the live app, Postgres, and MinIO — fine alone,
  but the build competes for CPU/RAM with the running services. The better
  shape: build in GitHub Actions → push to a registry (GHCR) → have the host
  pull the prebuilt image on deploy.
- **Retake the README screenshot.** The old capture showed a v0.1.0 build and
  was removed in 0.3.2; a current one (board view, light mode) should replace
  it.
- **Realtime granularity.** The SSE channel fires off the activity trail;
  same-column card reorders don't write activity and so don't push live.
  Either log reorders or move the channel to row-level change tracking.
- **Search indexes for boards/comments.** `searchBoards`/`searchComments`
  (`lib/queries/search.ts`) use a plain `ILIKE` scan, unlike the GIN
  expression index cards get (`cards_search_idx`). Fine at single-team scale;
  add matching indexes if board/comment volume grows.

## Mid term

- **Notification preferences.** Per-user opt-outs (e.g. mute email but keep
  in-app, mute a board) — the domain split in `lib/domain/notifications.ts`
  is the natural seam.

## Exploratory

- **Down-migration tooling.** Drizzle-kit has no built-in down-migration
  runner; rollback today means restoring from a backup or hand-writing a
  compensating migration. Worth revisiting if the team outgrows that.
- **Signed/stateless sessions.** `SESSION_SECRET` is reserved in
  `.env.example` for this; current sessions are DB-backed and revocable,
  which covers the immediate threat model, so this is low priority.
- **OAuth sign-in.** Not implemented; email/password with scrypt hashing
  covers the current journeys.
- **Historical burndown chart.** The analytics dashboard
  (`/boards/:boardId/analytics`) shows a live snapshot (cards by column/
  priority, load per member, overdue count) computed from current rows —
  there's no daily history table, so a real burndown-over-time chart would
  need one.

## Backlog

Unprioritized ideas, not yet committed to a term above. Promote an item to
Near/Mid/Exploratory term when it's ready to be scoped.

- **Butler-style automations.** Simple rules ("when moved to X, do Y").
- **Time tracking.** Manual or timer-based hours logged per card.
- **Custom fields.** Text, number, select, date fields configurable per board.
- **Slack/Discord integration.** Push board activity notifications externally.
- **Granular roles and permissions.** Per-list or per-action permissions,
  beyond the current owner/editor/observer split.
- **Shareable saved views.** Saved filter combinations are per-browser
  (`localStorage`, `app/boards/[boardId]/saved-views.tsx`) today; a
  board-level version would need a table and sharing UI.
- **Subtask rollup on the kanban card.** The parent's subtask progress bar
  only shows on the card detail page (`subtasks-section.tsx`); showing it on
  the board/list kanban chip too would need threading subtask counts
  through `getActiveColumnsWithCards`.
- **Dependency arrows on the timeline.** The Gantt view
  (`/boards/:boardId/gantt`) shows a lock icon on a blocked card but doesn't
  draw connector lines between bars — cheap with today's per-row layout,
  real arrow-drawing would need a shared SVG overlay across rows.
- **Cycle detection UI feedback beyond the error message.** `addDependencyAction`
  rejects a cycle (`lib/domain/dependencies.ts#wouldCreateCycle`) but the
  picker doesn't pre-filter cards that would cause one.

Contributions and discussion on priority are welcome — open an issue with
the journey or workflow you'd want to see supported.
