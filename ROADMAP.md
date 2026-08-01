# Roadmap

Stackboard covers three complete user journeys today (see README). This is
the list of known gaps and where the project could go next, roughly ordered
by expected value.

## Near term

- **Real-time sync.** Boards currently converge via `revalidatePath` on the
  next navigation/mutation, not live updates. Add a WebSocket/SSE channel
  (or a hosted realtime provider) so two members on the same board see
  moves/edits without a refresh.
- **Drag-and-drop column reordering in Settings.** Columns can be reordered
  today via up/down buttons for keyboard accessibility; a drag-and-drop
  control (mirroring the board view's card drag) is a natural upgrade once
  it's confirmed to stay keyboard-accessible.
- **`bun run lint`.** Currently blocked because `typescript-eslint` doesn't
  yet support the TypeScript 7.0 compiler this project ships with. Track
  upstream support and re-enable lint as a CI gate once available.

## Mid term

- **File attachments.** Requires a server-only object-storage adapter with
  short-lived signed URLs, per the working agreement in the Security
  decisions section of the README — not a client-side upload form.
- **Background job runner.** Invite emails currently send inline within the
  Server Action request, which is fine at this app's scale. A queue
  (e.g. a Postgres-backed job table or a hosted queue) would be worth it if
  invite volume grows or more async work (digest emails, exports) is added.
- **CSV import/export.** Out of scope for the three named journeys today;
  revisit if bulk board migration becomes a real user need.

## Exploratory

- **Down-migration tooling.** Drizzle-kit has no built-in down-migration
  runner; rollback today means restoring from a backup or hand-writing a
  compensating migration. Worth revisiting if the team outgrows that.
- **Signed/stateless sessions.** `SESSION_SECRET` is reserved in
  `.env.example` for this; current sessions are DB-backed and revocable,
  which covers the immediate threat model, so this is low priority.
- **OAuth sign-in.** Not implemented; email/password with scrypt hashing
  covers the current three journeys.

Contributions and discussion on priority are welcome — open an issue with
the journey or workflow you'd want to see supported.
