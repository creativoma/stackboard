// No `server-only` import — this module is shared by Server Actions and the
// standalone jobs worker (via lib/notifications/create.ts), like
// lib/jobs/handlers.ts. APP_URL is deployment config, not a secret.
export const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
