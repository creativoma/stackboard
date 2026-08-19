<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Stackboard

Trello-style board app: Next.js App Router (Server Components + Server Actions), Postgres via Drizzle ORM, Bun as the runner. See `README.md` for setup, `docs/` for deployment/configuration/architecture/security/testing, `DESIGN.md` for the design system, `CONTRIBUTING.md` for the PR checklist.

## Where code goes

| Path                                                  | Holds                                                                 |
| ----------------------------------------------------- | --------------------------------------------------------------------- |
| `app/`                                                | Routes, Server Components, and the client components a route needs    |
| `app/_components/`                                    | Shared UI primitives (button, drawer, avatar stack, priority icon, …) |
| `lib/actions/`                                        | Server Actions — the only write path                                  |
| `lib/queries/`                                        | Read-side DB queries (`server-only`)                                  |
| `lib/domain/`                                         | Pure logic, no I/O — every module here has unit tests in `__tests__`  |
| `lib/jobs/`                                           | Postgres-backed job queue, handlers, and the worker loop              |
| `lib/storage/`                                        | `ObjectStorage` adapter for attachments (local disk or S3/MinIO)      |
| `lib/auth/`, `lib/validation/`, `lib/email/`          | Sessions/passwords, zod schemas, email content + Resend adapter       |
| `lib/notifications/`, `lib/import/`, `lib/templates/` | Notification fan-out, board import, board/card templates              |
| `db/`                                                 | `schema.ts`, generated `migrations/`, `seed.ts`, worker entrypoint    |
| `test/`                                               | Integration (`integration/db.test.ts`) and Playwright (`e2e/`) suites |
| `website/`                                            | Separate Vite marketing site with its own toolchain (oxlint)          |

## Rules that matter here

- **Authorization is re-read from the database on every mutation** via `requireMembership` / `requireOwner` / `requireContentEditor` (`lib/actions/helpers.ts`). Never trust a role, membership, or board id shape passed from the client.
- **Validate every input server-side with `zod`**, with explicit length limits, independent of client-side `maxLength`/`required`.
- **New logic that can be pure goes in `lib/domain/` with a unit test.** Server Actions and queries stay thin around it.
- Server-only modules import `server-only`. The exception is `lib/email/send.ts`, which the standalone job worker imports outside Next's bundling — `lib/email/adapter.ts` is the guarded re-export for Server Actions.
- **Never render user input as HTML.** Descriptions go through `renderMarkdownLite` (`lib/markdown.ts`, escapes before formatting); mentions build React nodes (`app/_components/comment-body.tsx`).
- **Colors come from tokens in `app/globals.css`**, never hardcoded hex in components, and every token needs a dark value. Read `DESIGN.md` before touching styling — the palette is deliberately constrained.
- UI text is written in English.
- After editing `db/schema.ts`, run `bun run db:generate` and commit the generated migration.

## Before finishing

```bash
bun run lint && bun run typecheck && bun run test
```

Integration (`bun run test:integration`, needs a `stackboard_test` DB) and e2e (`bun run test:e2e`) when the change touches persistence or a user journey. CI runs all of them.
