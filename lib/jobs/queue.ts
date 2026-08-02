import 'server-only'
import { db, schema } from '@/db'

/**
 * Enqueues work for db/jobs-worker.ts to pick up, instead of doing it
 * inline within a Server Action's request/response cycle. Payload must be
 * JSON-serializable — it's stored as jsonb and read back by a handler in
 * lib/jobs/handlers.ts, keyed by `type`.
 */
export async function enqueueJob(
    type: string,
    payload: Record<string, unknown>
): Promise<void> {
    await db.insert(schema.jobs).values({ type, payload })
}
