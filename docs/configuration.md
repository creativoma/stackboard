# Configuration

All configuration is environment variables. `.env.example` documents every
variable with inline comments — copy it to `.env` for local development.

## App variables

Read by the Next.js app and the jobs worker.

| Variable               | Purpose                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Postgres connection string                                                                                                    |
| `SESSION_SECRET`       | Placeholder for a future signed-cookie secret — read by nothing today (see [security.md](./security.md))                      |
| `APP_URL`              | Base URL used to build absolute links (invite emails, notification emails, public-link display, sitemap)                      |
| `RESEND_API_KEY`       | If unset, invite emails are logged to the console instead of sent (deterministic local dev path)                              |
| `EMAIL_FROM`           | From-address for invite emails                                                                                                |
| `UPLOAD_DIR`           | Directory for attachment bytes via the local-disk storage adapter (default `./var/uploads`), used when `S3_ENDPOINT` is unset |
| `S3_ENDPOINT`          | S3-compatible endpoint (MinIO in production); when set, attachments go there instead of local disk                            |
| `S3_BUCKET`            | Bucket name for attachment storage                                                                                            |
| `S3_ACCESS_KEY_ID`     | Access key for the S3-compatible endpoint                                                                                     |
| `S3_SECRET_ACCESS_KEY` | Secret key for the S3-compatible endpoint                                                                                     |
| `S3_REGION`            | Region passed to the S3 client (default `us-east-1`; MinIO ignores the value but the SDK requires one)                        |

## `docker-compose.prod.yml` variables

Read by the production compose file, not by the app itself — see
[deployment.md](./deployment.md).

| Variable              | Purpose                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `WEB_BIND`            | Host interface the compose file publishes `web` on (default `127.0.0.1`); `0.0.0.0` exposes the app unproxied      |
| `WEB_PORT`            | Host port for the same mapping (default `3000`); change it when another service already holds the port             |
| `POSTGRES_PASSWORD`   | Password for the compose `db` service — ⚠️ only applied on first init of an empty volume, see the rotation runbook |
| `MINIO_ROOT_USER`     | MinIO root user; the compose file reuses it as the app's `S3_ACCESS_KEY_ID`                                        |
| `MINIO_ROOT_PASSWORD` | MinIO root password; reused as the app's `S3_SECRET_ACCESS_KEY`                                                    |

## Other

| Variable                             | Purpose                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Next.js built-in — set a shared stable value when deploying multiple instances (see [deployment.md](./deployment.md))     |
| `E2E_BASE_URL`                       | Test-only — points the Playwright suite at an already-running app instead of booting one (see [testing.md](./testing.md)) |
