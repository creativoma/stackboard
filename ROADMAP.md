# Roadmap

Stackboard covers the three original user journeys plus realtime sync,
notifications, mentions, watchers, an observer role, WIP limits, priority,
search, templates, attachments, custom labels, board colors, and a list
view (see CHANGELOG). This is the list of known gaps and where the project
could go next, roughly ordered by expected value.

## Near term

- **Single-TypeScript toolchain.** Lint runs in CI today, but only because
  `typescript` 6.x is installed alongside TypeScript 7 (`@typescript/native`)
  and ESLint is pinned to 9.x. Drop both pins once `typescript-eslint` runs on
  the TypeScript 7 API and `eslint-plugin-react` supports ESLint 10.
- **S3-compatible attachment backend.** Attachments ship with a local-disk
  `ObjectStorage` implementation (`lib/storage/local.ts`). Add an
  S3/R2-compatible implementation of the same interface with short-lived
  signed URLs for multi-instance deployments.
- **Realtime granularity.** The SSE channel fires off the activity trail;
  same-column card reorders don't write activity and so don't push live.
  Either log reorders or move the channel to row-level change tracking.

## Mid term

- **Notification preferences.** Per-user opt-outs (e.g. mute email but keep
  in-app, mute a board) — the domain split in `lib/domain/notifications.ts`
  is the natural seam.
- **Mention autocomplete.** The comment box accepts `@name` but offers no
  picker; add a members dropdown on `@`.

## Exploratory

- **Down-migration tooling.** Drizzle-kit has no built-in down-migration
  runner; rollback today means restoring from a backup or hand-writing a
  compensating migration. Worth revisiting if the team outgrows that.
- **Signed/stateless sessions.** `SESSION_SECRET` is reserved in
  `.env.example` for this; current sessions are DB-backed and revocable,
  which covers the immediate threat model, so this is low priority.
- **OAuth sign-in.** Not implemented; email/password with scrypt hashing
  covers the current journeys.

## Backlog

Unprioritized ideas, not yet committed to a term above. Promote an item to
Near/Mid/Exploratory term when it's ready to be scoped.

- **Global search.** Search cards, boards, and comments from any view.
- **Calendar view.** Show cards with due dates on a monthly calendar.
- **Gantt/timeline view.** Visual planning with card dependencies.
- **Butler-style automations.** Simple rules ("when moved to X, do Y").
- **Checklists inside cards.** Subtasks with completion progress (%).
- **Time tracking.** Manual or timer-based hours logged per card.
- **Saved filtered views.** Combinable filters a user can save and reuse.
- **Board analytics dashboard.** Burndown, cards by status, load per member.
- **In-app notification center.** Beyond email — a notification inbox in the UI.
- **Card templates.** Predefined checklists/fields per task type.
- **Custom fields.** Text, number, select, date fields configurable per board.
- **Attachment previews.** Preview images/PDFs without downloading.
- **Linked subtasks.** Child cards with their own status, rolled up to the parent.
- **Card dependencies.** "Blocked by" / "blocks" relationships.
- **Focus mode / "my work".** Personal view of only the cards assigned to you.
- **Board export.** CSV/PDF export or a JSON backup.
- **Slack/Discord integration.** Push board activity notifications externally.
- **Board-level activity history.** Expand the per-card activity trail to a
  board-wide timeline.
- **Granular roles and permissions.** Per-list or per-action permissions,
  beyond the current owner/editor/observer split.
- **Public read-only board links.** Share a board view without requiring login.

Contributions and discussion on priority are welcome — open an issue with
the journey or workflow you'd want to see supported.
