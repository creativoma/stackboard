import { describe, expect, it } from 'vitest'
import {
    DB_SLOW_MS,
    JOB_LAG_DEGRADED_SECONDS,
    JOB_LAG_DOWN_SECONDS,
    classifyDatabase,
    classifyJobQueue,
    healthHttpStatus,
    summarizeHealth,
    type HealthCheck,
} from '../health'

const check = (name: string, status: HealthCheck['status']): HealthCheck => ({
    name,
    status,
})

describe('summarizeHealth', () => {
    it('is ok only when every check is ok', () => {
        expect(
            summarizeHealth([check('db', 'ok'), check('jobs', 'ok')]).status
        ).toBe('ok')
    })

    it('degrades on a single degraded check', () => {
        expect(
            summarizeHealth([check('db', 'ok'), check('jobs', 'degraded')])
                .status
        ).toBe('degraded')
    })

    it('lets a down check outrank a degraded one regardless of order', () => {
        expect(
            summarizeHealth([check('db', 'degraded'), check('jobs', 'down')])
                .status
        ).toBe('down')
        expect(
            summarizeHealth([check('db', 'down'), check('jobs', 'degraded')])
                .status
        ).toBe('down')
    })

    it('reports down rather than ok when no checks ran', () => {
        const report = summarizeHealth([])
        expect(report.status).toBe('down')
        expect(report.checks).toHaveLength(1)
    })

    it('passes the checks through untouched', () => {
        const checks = [check('db', 'ok')]
        expect(summarizeHealth(checks).checks).toEqual(checks)
    })
})

describe('classifyDatabase', () => {
    it('is ok while the query returns promptly', () => {
        expect(classifyDatabase(0)).toBe('ok')
        expect(classifyDatabase(DB_SLOW_MS - 1)).toBe('ok')
    })

    it('degrades at the slow threshold', () => {
        expect(classifyDatabase(DB_SLOW_MS)).toBe('degraded')
        expect(classifyDatabase(DB_SLOW_MS * 10)).toBe('degraded')
    })
})

describe('classifyJobQueue', () => {
    it('treats an empty queue as healthy, not unknown', () => {
        expect(classifyJobQueue(null)).toBe('ok')
    })

    it('is ok while jobs are picked up in time', () => {
        expect(classifyJobQueue(0)).toBe('ok')
        expect(classifyJobQueue(JOB_LAG_DEGRADED_SECONDS - 1)).toBe('ok')
    })

    it('degrades once the oldest due job has waited too long', () => {
        expect(classifyJobQueue(JOB_LAG_DEGRADED_SECONDS)).toBe('degraded')
        expect(classifyJobQueue(JOB_LAG_DOWN_SECONDS - 1)).toBe('degraded')
    })

    it('goes down when the worker is clearly not draining the queue', () => {
        expect(classifyJobQueue(JOB_LAG_DOWN_SECONDS)).toBe('down')
        expect(classifyJobQueue(JOB_LAG_DOWN_SECONDS * 2)).toBe('down')
    })
})

describe('healthHttpStatus', () => {
    it('fails the request only when the system is down', () => {
        expect(healthHttpStatus('ok')).toBe(200)
        expect(healthHttpStatus('degraded')).toBe(200)
        expect(healthHttpStatus('down')).toBe(503)
    })
})
