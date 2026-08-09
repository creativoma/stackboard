# stackboard-website

The marketing/OSS landing page for [Stackboard](https://github.com/creativoma/stackboard) — a static Vite + React site, deployed independently from the app itself so the landing doesn't need app infra (Postgres, sessions) to stay up.

## Develop

```bash
bun install
bun dev
```

## Build

```bash
bun run build
```

Outputs to `dist/`. Deploy `website/` as its own Vercel project (root directory: `website`) — build command `bun run build`, output directory `dist`.

Colors, radii, and component classes in `src/index.css` are copied by hand from the main app's `DESIGN.md` / `app/globals.css` ("Blueprint" design system). If the palette changes there, update this file too.
