# Testing

Three layers, each with its own isolated setup:

```bash
bun run test              # unit tests (vitest) — pure domain logic, no I/O
bun run test:integration  # integration tests against a real, isolated Postgres DB
bun run test:e2e          # Playwright browser tests covering the user journeys
```

Run `bun run typecheck` for a strict TypeScript pass (the project has no
`any`-shaped escape hatches in application code) and `bun run lint` for
ESLint.

## Dead-code checks

`bun run knip` reports unused files, dependencies, and exports. It exits
non-zero when it finds anything, which is how it would gate CI — today it is
a local check, so run it after adding or deleting modules, dependencies, or
exports.

Two things in `knip.json` are worth knowing before trusting its output:

- **Both workspaces are declared** (`.` and `website`). Without that, Knip
  analyses only the root project, never sees Vite's `index.html` as an entry
  point, and reports every `website/src/**` file as unused.
- **`sharp` is in `ignoreDependencies`.** No module imports it; Next loads it
  at runtime for image optimization on a self-hosted deploy. Removing it
  because Knip called it unused would silently degrade image handling in
  production.

The e2e and integration suites are declared as entry points too, so their
helpers don't read as dead code.

## Unit tests

`lib/**/__tests__` (config: `vitest.config.mts`). Pure logic only — no
database, no network. Covered modules:

- `lib/domain/`: authorization predicates (including the observer role),
  position/reorder math, filter logic, invitation expiry rules, WIP-limit
  checks, due-date bucketing, mention parsing, notification fan-out rules,
  search-query normalization, attachment validation/filename sanitizing, SSE
  event shaping, activity formatting, analytics tallying, calendar month-grid
  math, subtask rollup, dependency cycle detection, Gantt bar/range layout,
  and health-status aggregation.
- `lib/__tests__/markdown.test.ts`: markdown-lite XSS safety.
- `lib/auth/__tests__/password.test.ts`: scrypt password hashing.
- `lib/templates/__tests__/boards.test.ts`: board-template definitions.
- `lib/import/__tests__/csv.test.ts`: CSV import parsing.

## Integration tests

`test/integration/db.test.ts` (config: `vitest.integration.config.mts`) runs
against `stackboard_test`, a separate database from your dev DB. It drops and
recreates the schema before each run and wipes tables between tests, so it is
safe to run repeatedly but **must never point at a database with real data**
— the suite refuses to start unless `DATABASE_URL` contains
`stackboard_test`. Create it once with:

```bash
docker exec -it <postgres-container> psql -U stackboard -d stackboard -c "CREATE DATABASE stackboard_test;"
```

## End-to-end tests

`test/e2e/*.spec.ts` (Playwright). By default the suite builds the app and
boots it on port **3100** (`playwright.config.ts`) against your real dev
database, reseeded via `global-setup.ts` — set `E2E_BASE_URL` to point it at
an already-running instance instead. It then drives a real browser through:

1. owner creates a board, invites a teammate, adds a card with assignee/due
   date/checklist (`journey-create-board`)
2. teammate filters to their cards, completes a checklist item, comments, and
   **drags** a card to Done — real pointer events, not a simulated event
   (`journey-teammate-workflow`)
3. owner archives a card and an empty column, reviews the activity trail,
   restores the card into a chosen column (`journey-archive-restore`)
4. a card created by one member appears on another member's open board with
   no interaction — real-time SSE sync (`journey-realtime`)
5. owner drag-reorders columns in Settings (`journey-column-reorder`)
6. a board round-trips through CSV export and import
   (`journey-csv-import-export`)
7. a non-member is denied access to the board via a direct URL, and the board
   is usable at a 390×844 mobile viewport (`permission-and-mobile`)
8. the health endpoint reports a live database and job queue, and leaks no
   connection details (`health-endpoint`)

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull
request, in three parallel jobs:

| Job           | What it runs                                                                        |
| ------------- | ----------------------------------------------------------------------------------- |
| `unit`        | `lint`, `typecheck`, `test`, `build`                                                |
| `integration` | `test:integration` against a `postgres:16` service container (`stackboard_test` DB) |
| `e2e`         | `db:migrate` then `test:e2e` (Chromium); uploads the Playwright report on failure   |
