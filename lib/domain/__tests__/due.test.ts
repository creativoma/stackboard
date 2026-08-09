import { describe, expect, it } from 'vitest'
import {
    bucketByDue,
    coerceDueDate,
    dueDateToIso,
    isValidDueDate,
    parseDueDate,
    DUE_BUCKETS,
} from '../due'

type Item = { id: string; dueDate: Date | null }

const NOW = new Date('2026-08-09T12:00:00Z')

function item(id: string, iso: string | null): Item {
    return { id, dueDate: iso ? new Date(iso) : null }
}

describe('bucketByDue', () => {
    it('exposes buckets in display order', () => {
        expect(DUE_BUCKETS).toEqual([
            'overdue',
            'today',
            'thisWeek',
            'later',
            'noDate',
        ])
    })

    it('splits cards into overdue / today / thisWeek / later / noDate', () => {
        const buckets = bucketByDue(
            [
                item('past', '2026-08-08T09:00:00Z'),
                item('earlier-today', '2026-08-09T08:00:00Z'),
                item('tonight', '2026-08-09T22:00:00Z'),
                item('in-three-days', '2026-08-12T10:00:00Z'),
                item('next-month', '2026-09-20T10:00:00Z'),
                item('unscheduled', null),
            ],
            NOW
        )

        // A due time earlier the same day is overdue (consistent with isOverdue).
        expect(buckets.overdue.map((c) => c.id)).toEqual([
            'past',
            'earlier-today',
        ])
        expect(buckets.today.map((c) => c.id)).toEqual(['tonight'])
        expect(buckets.thisWeek.map((c) => c.id)).toEqual(['in-three-days'])
        expect(buckets.later.map((c) => c.id)).toEqual(['next-month'])
        expect(buckets.noDate.map((c) => c.id)).toEqual(['unscheduled'])
    })

    it('places an earlier-same-day due time in overdue (consistent with isOverdue)', () => {
        const buckets = bucketByDue([item('x', '2026-08-09T08:00:00Z')], NOW)
        expect(buckets.overdue.map((c) => c.id)).toEqual(['x'])
    })

    it('sorts each dated bucket by soonest due date first', () => {
        const buckets = bucketByDue(
            [
                item('b', '2026-08-13T10:00:00Z'),
                item('a', '2026-08-11T10:00:00Z'),
            ],
            NOW
        )
        expect(buckets.thisWeek.map((c) => c.id)).toEqual(['a', 'b'])
    })

    it('buckets a date Postgres round-tripped into an Invalid Date as noDate', () => {
        const buckets = bucketByDue(
            [{ id: 'broken', dueDate: new Date('0022-02-02 00:00:00+00') }],
            NOW
        )
        expect(buckets.noDate.map((c) => c.id)).toEqual(['broken'])
    })

    it('treats exactly seven days out as thisWeek, beyond as later', () => {
        const buckets = bucketByDue(
            [
                item('edge', '2026-08-16T11:59:00Z'),
                item('beyond', '2026-08-16T12:01:00Z'),
            ],
            NOW
        )
        expect(buckets.thisWeek.map((c) => c.id)).toEqual(['edge'])
        expect(buckets.later.map((c) => c.id)).toEqual(['beyond'])
    })
})

describe('isValidDueDate', () => {
    it('accepts dates inside the supported year range', () => {
        expect(isValidDueDate(new Date('2026-08-09T12:00:00Z'))).toBe(true)
        expect(isValidDueDate(new Date('1970-01-01T00:00:00Z'))).toBe(true)
        expect(isValidDueDate(new Date('2999-12-31T00:00:00Z'))).toBe(true)
    })

    it('rejects null, Invalid Date, and years outside the range', () => {
        expect(isValidDueDate(null)).toBe(false)
        expect(isValidDueDate(undefined)).toBe(false)
        expect(isValidDueDate(new Date('nonsense'))).toBe(false)
        expect(isValidDueDate(new Date('0022-02-02T00:00:00Z'))).toBe(false)
        expect(isValidDueDate(new Date('3000-01-01T00:00:00Z'))).toBe(false)
    })
})

describe('parseDueDate', () => {
    it('parses a date input value', () => {
        expect(parseDueDate('2026-09-01')).toEqual(new Date('2026-09-01'))
    })

    it('reads empty input as clearing the date', () => {
        expect(parseDueDate('')).toBeNull()
    })

    it('returns undefined for values a Postgres round-trip would break', () => {
        // Stored as year 22, read back as Invalid Date — the bug this guards.
        expect(parseDueDate('0022-02-02')).toBeUndefined()
        expect(parseDueDate('not a date')).toBeUndefined()
        expect(parseDueDate('275760-09-13')).toBeUndefined()
    })
})

describe('coerceDueDate', () => {
    it('keeps usable dates and drops the rest', () => {
        expect(coerceDueDate('2026-09-01T00:00:00.000Z')).toEqual(
            new Date('2026-09-01T00:00:00.000Z')
        )
        expect(coerceDueDate('0022-02-02')).toBeNull()
        expect(coerceDueDate('')).toBeNull()
        expect(coerceDueDate(null)).toBeNull()
    })
})

describe('dueDateToIso', () => {
    it('serializes a usable date', () => {
        expect(dueDateToIso(new Date('2026-09-01T00:00:00.000Z'))).toBe(
            '2026-09-01T00:00:00.000Z'
        )
    })

    it('returns null instead of throwing on a broken stored date', () => {
        expect(dueDateToIso(new Date('0022-02-02 00:00:00+00'))).toBeNull()
        expect(dueDateToIso(null)).toBeNull()
    })
})
