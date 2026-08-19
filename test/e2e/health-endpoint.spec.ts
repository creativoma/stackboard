import { test, expect } from '@playwright/test'

/**
 * Covers the route handler itself — the aggregation rules and thresholds it
 * calls into are unit-tested in lib/domain/__tests__/health.test.ts, including
 * the `down`/503 path, which can't be exercised here without taking Postgres
 * down mid-suite. No login: the endpoint is deliberately unauthenticated so
 * the container healthcheck can call it.
 */
test('health endpoint reports a live database and job queue', async ({
    request,
}) => {
    const response = await request.get('/api/health')

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/json')
    // A monitor must never be handed a cached verdict.
    expect(response.headers()['cache-control']).toContain('no-store')

    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(typeof body.timestamp).toBe('string')

    const names = body.checks.map((check: { name: string }) => check.name)
    expect(names).toEqual(['database', 'jobs'])

    for (const check of body.checks) {
        expect(check.status).toBe('ok')
        expect(typeof check.durationMs).toBe('number')
    }
})

test('health endpoint leaks no connection details', async ({ request }) => {
    const response = await request.get('/api/health')
    const raw = await response.text()

    // The endpoint is public, and a postgres-js error carries the host and
    // user, so failures are logged server-side and never serialized here.
    expect(raw).not.toContain('postgresql://')
    expect(raw).not.toContain('password')
    for (const fragment of ['stackboard_test', '5432']) {
        expect(raw).not.toContain(fragment)
    }
})
