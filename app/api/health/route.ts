import { and, eq, lte, sql } from 'drizzle-orm'
import { db, schema } from '@/db'
import {
    classifyDatabase,
    classifyJobQueue,
    healthHttpStatus,
    summarizeHealth,
    type HealthCheck,
} from '@/lib/domain/health'

/**
 * Liveness/readiness probe for the container healthcheck and the uptime
 * monitor. Deliberately unauthenticated, so the body carries statuses and
 * timings only — never error text, which can leak the database host or
 * user. Real errors go to the server log.
 *
 * Route Handlers aren't cached by default, and both probes hit the database
 * on every request, so this always runs fresh.
 */
export async function GET() {
    const checks: HealthCheck[] = []

    const startedAt = Date.now()
    try {
        await db.execute(sql`select 1`)
        const durationMs = Date.now() - startedAt
        checks.push({
            name: 'database',
            status: classifyDatabase(durationMs),
            durationMs,
        })
    } catch (error) {
        console.error('[health] database probe failed', error)
        checks.push({
            name: 'database',
            status: 'down',
            durationMs: Date.now() - startedAt,
            detail: 'unreachable',
        })
    }

    // The web container can be perfectly healthy while the worker is dead,
    // so a backed-up queue has to be its own check.
    if (checks[0]?.status === 'down') {
        checks.push({
            name: 'jobs',
            status: 'down',
            durationMs: null,
            detail: 'not checked: database unreachable',
        })
    } else {
        const jobsStartedAt = Date.now()
        try {
            const [row] = await db
                .select({
                    oldestPendingSeconds: sql<
                        number | null
                    >`extract(epoch from now() - min(${schema.jobs.runAfter}))::double precision`,
                    pending: sql<number>`count(*)::int`,
                })
                .from(schema.jobs)
                .where(
                    and(
                        eq(schema.jobs.status, 'pending'),
                        lte(schema.jobs.runAfter, sql`now()`)
                    )
                )

            const oldestPendingSeconds = row?.oldestPendingSeconds ?? null
            checks.push({
                name: 'jobs',
                status: classifyJobQueue(oldestPendingSeconds),
                durationMs: Date.now() - jobsStartedAt,
                detail: `${row?.pending ?? 0} due, oldest ${
                    oldestPendingSeconds === null
                        ? 'n/a'
                        : `${Math.round(oldestPendingSeconds)}s`
                }`,
            })
        } catch (error) {
            console.error('[health] job queue probe failed', error)
            checks.push({
                name: 'jobs',
                status: 'down',
                durationMs: Date.now() - jobsStartedAt,
                detail: 'query failed',
            })
        }
    }

    const report = summarizeHealth(checks)

    return Response.json(
        { ...report, timestamp: new Date().toISOString() },
        {
            status: healthHttpStatus(report.status),
            headers: { 'cache-control': 'no-store' },
        }
    )
}
