# Contributing to Stackboard

Thanks for taking the time to contribute.

## Getting started

Follow the [Local setup](./README.md#local-setup) section in the README to get a working dev environment (Postgres via Docker, migrations, seed data).

## Before opening a PR

```bash
bun run typecheck         # strict TypeScript pass, no `any` escape hatches
bun run test               # unit tests
bun run test:integration   # requires a `stackboard_test` database (see README)
bun run test:e2e           # Playwright, builds and boots the app
bun run format              # prettier --write .
```

`bun run lint` currently fails in this environment because `typescript-eslint` doesn't yet support the TypeScript 7.0 compiler this project ships with — `bun run typecheck` is the enforced type-safety gate instead.

## Coding conventions

- Server Actions are the source of truth for authorization — every mutation must re-check membership/ownership server-side via `requireMembership`/`requireOwner` (`lib/actions/helpers.ts`), never trust a role passed from the client.
- Validate and length-limit all user-facing form input server-side with `zod`, independent of client-side constraints.
- New UI text must be written in English.
- Prefer editing existing files and patterns already used in the codebase over introducing new abstractions.

## Commit messages and PRs

- Keep PRs focused on a single change; unrelated cleanup belongs in its own PR.
- Describe the "why" in the PR description, not just the "what" — reviewers can read the diff.
- Add or update tests for any behavior change.

## Reporting bugs / proposing features

Open an issue on the [GitHub repository](https://github.com/creativoma/stackboard) with steps to reproduce (for bugs) or the problem you're trying to solve (for features).
