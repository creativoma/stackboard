# Security decisions

- **Authorization is enforced server-side on every mutation**, not just in the
  UI. Every Server Action re-reads the caller's board membership from the
  database via `requireMembership`/`requireOwner` (`lib/actions/helpers.ts`) —
  it never trusts a role or membership flag passed from the client. Removing a
  member flips their `board_memberships.status` to `removed`; their next
  request re-reads that row and is denied, even for a card edit form they had
  already loaded (covered by the acceptance-scenario integration test).
- **Sessions** are opaque random tokens in an httpOnly, `sameSite=lax` cookie;
  only a SHA-256 hash of the token is stored server-side, so a database leak
  doesn't hand out valid session tokens. `SESSION_SECRET` is reserved in
  `.env.example` for a future move to signed/stateless sessions; the current
  implementation is DB-backed and revocable (logging out deletes the row),
  which is why a stolen-secret scenario is less of a concern than usual — the
  main exposure is XSS-via-cookie-theft, mitigated by httpOnly.
- **Passwords** are hashed with scrypt (Node's built-in `crypto.scrypt`,
  64-byte derived key, random 16-byte salt per password) and compared with
  `timingSafeEqual`.
- **Markdown descriptions** go through a hand-rolled `renderMarkdownLite`
  (`lib/markdown.ts`) that HTML-escapes the entire input _before_ applying any
  formatting substitution, so user input can never introduce a new tag or
  attribute — only the literal `<strong>`/`<em>`/`<code>`/`<a>` tags the
  renderer itself writes ever appear in the output. Links are restricted to
  `http(s)://` schemes.
- **Invite emails** escape all interpolated values and only ever link to a
  same-origin `/invite/<token>` URL.
- **Roles**: `owner` > `member` > `observer`. Observers are active members for
  read access, but `requireContentEditor` (`lib/actions/helpers.ts`) rejects
  every content mutation server-side, and invitations carry the granted role
  (owners are never created by invite).
- **File uploads** go through a server-only object-storage adapter
  (`lib/storage/`) with server-generated keys — the user's filename never
  becomes a filesystem path, names are sanitized (`lib/domain/attachments.ts`)
  before display or `Content-Disposition`, size is validated server-side
  (10MB), and downloads re-check board membership on every request. OAuth
  remains out of scope.
- **@mentions** resolve only against active board members and comments stay
  plain text — the mention highlighter (`app/_components/comment-body.tsx`)
  builds React nodes, never HTML.
- **The SSE channel** (`/boards/:boardId/events`) authenticates the session
  cookie and re-checks board membership before streaming, and only ever emits
  event timestamps/ids — no card content travels over it.
- **Board import (Trello/Stackboard JSON exports, or a Stackboard CSV
  export)** is authenticated-only, validates and length-limits every field
  server-side (via `zod` for JSON, matching length checks for CSV) before
  insert, and creates a brand-new board scoped to the importing user — it
  never merges into or overwrites an existing board.
- Every user-facing form validates and length-limits input server-side with
  `zod`, independent of any client-side `maxLength`/`required` attributes.
- **Public board link tokens** (`boards.publicToken`) are stored in plaintext,
  unlike session and invite tokens (both hashed). This is a deliberate
  exception: the token only ever grants _read_ access to content that's
  already visible to every board member, it's owner-revocable/rotatable at any
  time, and the owner needs to look the link up again later (Settings → Public
  link) without regenerating it — a hash would make that impossible, the same
  tradeoff Trello/Notion-style share links make.
  `generatePublicLinkAction`/`revokePublicLinkAction`
  (`lib/actions/public-links.ts`) are owner-only via `requireOwner`, and the
  public route (`app/p/[token]/page.tsx`) never exposes assignees, comments,
  attachments, or activity — see
  [architecture.md](./architecture.md#public-read-only-board-links).
