# Deployment

Stackboard ships two supported deploy shapes: the containerized stack in
`docker-compose.prod.yml`, and any plain Node.js host. Both are
platform-agnostic — nothing in the repo assumes a specific provider.

## Containerized (Docker Compose)

`Dockerfile` + `docker-compose.prod.yml` run the whole stack — `web`,
`worker`, Postgres, and MinIO — on a single host. Verify locally before
touching a server:

```bash
docker compose -f docker-compose.prod.yml up --build
```

The compose file works as-is on any Docker-Compose-based host or PaaS
(Coolify, Dokploy, a plain VM with Compose, …). Two notes that apply
everywhere:

- **Set every real value in your platform's env panel** (or an env file kept
  out of git): `POSTGRES_PASSWORD`, `SESSION_SECRET`, `APP_URL`,
  `RESEND_API_KEY`, `MINIO_ROOT_PASSWORD`. Never edit the compose file with
  real secrets. See [configuration.md](./configuration.md) for the full
  variable list.
- **The `ports:` block on `web` needs no editing.** It binds to `127.0.0.1`
  by default, which keeps the app off the public internet without TLS — a
  reverse proxy (Traefik, nginx, Caddy) should face the public. A PaaS that
  proxies containers over the Docker network ignores the mapping entirely.
  Set `WEB_BIND=0.0.0.0` only to deliberately expose the app unproxied.

If your platform offers both a "point at a Git repository" resource and a
"paste the compose YAML" resource, prefer the Git one pointed at
`docker-compose.prod.yml` — a pasted-YAML resource typically has no checkout
to run the `build:` contexts against.

### Migrations on deploy

The `web` image's start command runs `drizzle-kit migrate` and then starts
the server, so every container migrates before it serves. This is deliberate:
a container that starts serving (and passing its healthcheck) against an
unmigrated database returns 500s from every page that touches the DB.
Platform pre-deploy hooks were tried first and are _not_ reliable here — it
can be ambiguous whether they run against the newly-built image or the
outgoing one. No deploy hook is needed.

### Health endpoint

`GET /api/health` reports whether the app can actually serve, not just
whether the process is up. It probes Postgres with a timed `select 1` and
measures how long the oldest already-due job has been waiting — a `web`
container can be perfectly responsive while the `worker` is dead and no
invite email is going out.

```json
{
    "status": "ok",
    "checks": [
        { "name": "database", "status": "ok", "durationMs": 3 },
        {
            "name": "jobs",
            "status": "ok",
            "durationMs": 2,
            "detail": "0 due, oldest n/a"
        }
    ],
    "timestamp": "2026-08-19T21:00:00.000Z"
}
```

`status` is `ok`, `degraded` (slow database, or the queue running late), or
`down`. The response is `200` for the first two and `503` for `down`, so an
uptime monitor or load balancer sees a failure without parsing the body.
Thresholds live in `lib/domain/health.ts`.

The endpoint is unauthenticated by design — the container healthcheck in
`docker-compose.prod.yml` calls it — so the body carries statuses and timings
only, never error text, which could leak the database host or user. Real
errors go to the server log. Point an external uptime monitor at it and alert
on non-`200`; to catch `degraded` too, match the body against
`"status":"ok"`.

### ⚠️ Rotating `POSTGRES_PASSWORD` on an existing database

**Changing `POSTGRES_PASSWORD` in your host's env panel is not enough**, and
it fails in a way that's genuinely hard to diagnose. The Postgres image only
reads that variable when it initializes an _empty_ data directory; once the
volume holds data, the real password lives inside the database and the
variable is ignored. Change only the variable and `web`/`worker` will
authenticate with the new value against a database that still expects the old
one — they can't connect, never pass their healthcheck, and the orchestrator
may delete the containers before you can read their logs.

Rotate in this order:

1. Change the password _in the database first_, against the running container:
    ```bash
    docker exec -it <db-container> psql -U stackboard -d stackboard \
      -c "ALTER USER stackboard WITH PASSWORD 'the-new-value';"
    ```
2. Then set `POSTGRES_PASSWORD` to that same value in the env panel.
3. Redeploy.

The same applies to any other credential baked into a volume on first init.

## Any Node.js host (no containers)

Vercel, Fly, Render, a plain VM:

1. Provision Postgres and set `DATABASE_URL`.
2. Set `APP_URL` (your public URL), and `RESEND_API_KEY`/`EMAIL_FROM` if you
   want real invite emails. (`SESSION_SECRET` is reserved for future use and
   read by nothing today — see [configuration.md](./configuration.md).)
3. Run `bun run db:migrate` as a release step before starting new instances.
4. `bun run build && bun run start`.
5. Run the jobs worker (`bun run db:jobs:work`) as a second long-lived
   process — see [architecture.md](./architecture.md#background-jobs).
6. If you deploy to multiple instances/regions, set
   `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` to a stable value shared across them
   (see Next.js's Server Actions guide) so Server Action payloads stay
   decryptable across instances.

## Backup and restore

This app doesn't ship its own backup tooling — use standard Postgres tooling
against `DATABASE_URL`:

```bash
pg_dump "$DATABASE_URL" -Fc -f backup.dump          # backup
pg_restore -d "$DATABASE_URL" --clean backup.dump   # restore
```

Take a backup before running `db:migrate` against a production database, and
before any manual data-repair `psql` session.
