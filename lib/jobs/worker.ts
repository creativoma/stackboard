import { and, asc, eq, inArray, lte } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '@/db/schema'
import { jobHandlers } from './handlers'

// No `server-only` import (unlike lib/jobs/queue.ts) — this is loaded by
// db/jobs-worker.ts, a plain tsx script outside Next's server bundling
// context. It takes a `db` instance rather than importing the guarded
// singleton in @/db, so it can be driven by either that singleton (from
// Next server code, if ever needed) or a standalone client (the worker
// script).
type Db = PostgresJsDatabase<typeof schema>

const BATCH_SIZE = 10
const MAX_ATTEMPTS = 5

function backoffMs(attempts: number): number {
    return Math.min(60_000, 1_000 * 2 ** attempts)
}

/** Claims and runs up to BATCH_SIZE due jobs. Returns how many it processed. */
export async function processDueJobs(db: Db): Promise<number> {
    const claimed = await db.transaction(async (tx) => {
        const due = await tx
            .select()
            .from(schema.jobs)
            .where(
                and(
                    eq(schema.jobs.status, 'pending'),
                    lte(schema.jobs.runAfter, new Date())
                )
            )
            .orderBy(asc(schema.jobs.runAfter))
            .limit(BATCH_SIZE)
            .for('update', { skipLocked: true })

        if (due.length === 0) return []

        await tx
            .update(schema.jobs)
            .set({ status: 'processing', updatedAt: new Date() })
            .where(
                inArray(
                    schema.jobs.id,
                    due.map((job) => job.id)
                )
            )

        return due
    })

    for (const job of claimed) {
        try {
            const handler = jobHandlers[job.type]
            if (!handler) {
                throw new Error(
                    `No handler registered for job type "${job.type}"`
                )
            }
            await handler(job.payload)
            await db
                .update(schema.jobs)
                .set({ status: 'done', updatedAt: new Date() })
                .where(eq(schema.jobs.id, job.id))
        } catch (err) {
            const attempts = job.attempts + 1
            const exhausted = attempts >= MAX_ATTEMPTS
            await db
                .update(schema.jobs)
                .set({
                    status: exhausted ? 'failed' : 'pending',
                    attempts,
                    lastError: err instanceof Error ? err.message : String(err),
                    runAfter: new Date(Date.now() + backoffMs(attempts)),
                    updatedAt: new Date(),
                })
                .where(eq(schema.jobs.id, job.id))
        }
    }

    return claimed.length
}
