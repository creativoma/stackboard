# Roadmap

Stackboard covers the three original user journeys plus realtime sync,
notifications, mentions, watchers, an observer role, WIP limits, priority,
search, templates, and attachments (see CHANGELOG). This is the list of known
gaps and where the project could go next, roughly ordered by expected value.

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

Contributions and discussion on priority are welcome — open an issue with
the journey or workflow you'd want to see supported.
