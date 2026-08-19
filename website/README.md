# stackboard-website

The marketing/OSS landing page for [Stackboard](https://github.com/creativoma/stackboard) — a static Vite + React site. It runs without any of the app's infrastructure (Postgres, sessions), but its **build** reads `../CHANGELOG.md` and `../ROADMAP.md` from the repo root (`vite.config.ts`, the `virtual:updates-data` plugin) to generate the "Recently shipped" / "What's next" lists — so building requires the full repository checkout, not just this folder's contents.

## Develop

```bash
bun install
bun dev
```

## Build

```bash
bun run build
```

Outputs to `dist/`. Deploy it to any static host (Vercel, Netlify, Cloudflare Pages, plain nginx, …). On platforms with a "root directory" setting, point the project at `website/` with build command `bun run build` and output directory `dist` — the platform must still clone the whole repository so the build can read the root changelog/roadmap.

Colors, radii, and component classes in `src/index.css` are copied by hand from the main app's `DESIGN.md` / `app/globals.css` ("Blueprint" design system). If the palette changes there, update this file too.
