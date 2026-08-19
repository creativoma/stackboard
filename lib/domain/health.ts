/**
 * Health-check aggregation. Pure/no I/O so it's unit-testable — the route
 * handler (app/api/health/route.ts) does the probing and hands the raw
 * readings here to decide what the overall status is.
 */

export type CheckStatus = 'ok' | 'degraded' | 'down'

export type HealthCheck = {
    name: string
    status: CheckStatus
    /** How long the probe took, in ms. Null when the probe never ran. */
    durationMs?: number | null
    detail?: string | null
}

export type HealthReport = {
    status: CheckStatus
    checks: HealthCheck[]
}

/**
 * A queue that has fallen this far behind means the worker is wedged or
 * dead, even though the web container answers fine. Roughly: a job that
 * should have run 5 minutes ago is late, 30 minutes is broken.
 */
export const JOB_LAG_DEGRADED_SECONDS = 5 * 60
export const JOB_LAG_DOWN_SECONDS = 30 * 60

/** Postgres answering this slowly is alive but not healthy. */
export const DB_SLOW_MS = 1_000

/**
 * The worst status wins: any `down` check takes the whole report down, any
 * `degraded` one degrades it. An empty list is `down` — reporting "ok"
 * because nothing was measured is the failure mode worth avoiding here.
 */
export function summarizeHealth(checks: HealthCheck[]): HealthReport {
    if (checks.length === 0) {
        return {
            status: 'down',
            checks: [{ name: 'self', status: 'down', detail: 'no checks ran' }],
        }
    }

    const status = checks.some((c) => c.status === 'down')
        ? 'down'
        : checks.some((c) => c.status === 'degraded')
          ? 'degraded'
          : 'ok'

    return { status, checks }
}

/** A reachable database is only `ok` while it also answers promptly. */
export function classifyDatabase(durationMs: number): CheckStatus {
    return durationMs >= DB_SLOW_MS ? 'degraded' : 'ok'
}

/**
 * `oldestPendingSeconds` is the age of the oldest job that is already due to
 * run — null when the queue is empty or everything is scheduled for later,
 * which is a healthy queue, not an unknown one.
 */
export function classifyJobQueue(
    oldestPendingSeconds: number | null
): CheckStatus {
    if (oldestPendingSeconds === null) return 'ok'
    if (oldestPendingSeconds >= JOB_LAG_DOWN_SECONDS) return 'down'
    if (oldestPendingSeconds >= JOB_LAG_DEGRADED_SECONDS) return 'degraded'
    return 'ok'
}

/** 503 for a down system so an uptime monitor sees a failure without parsing the body. */
export function healthHttpStatus(status: CheckStatus): number {
    return status === 'down' ? 503 : 200
}
