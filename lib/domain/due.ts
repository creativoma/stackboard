import { isOverdue } from './filters'

/**
 * Due-date bucketing for the "My cards" view.
 *
 * Buckets, in display order: overdue (strictly before now — consistent with
 * `isOverdue`, so an earlier-same-day time is overdue, not "today"), today
 * (rest of the calendar day, UTC), thisWeek (next 7×24h), later, noDate.
 */

export const DUE_BUCKETS = [
    'overdue',
    'today',
    'thisWeek',
    'later',
    'noDate',
] as const
export type DueBucket = (typeof DUE_BUCKETS)[number]

export type DueBuckets<T> = Record<DueBucket, T[]>

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Due dates are the only user-supplied timestamp, so they are the only one
 * that can be absurd. Postgres happily stores year 22; on the way back
 * postgres-js hands `0022-02-02 00:00:00+00` to `new Date()`, which V8 reads
 * as Invalid Date for years under 100 (and silently misreads some of them —
 * `0001-…` parses as 2002). So: reject implausible years on write, and treat
 * anything that slipped in already as "no date" on read rather than throwing.
 */
export const MIN_DUE_YEAR = 1970
export const MAX_DUE_YEAR = 2999

export function isValidDueDate(date: Date | null | undefined): date is Date {
    if (!date || Number.isNaN(date.getTime())) return false
    const year = date.getUTCFullYear()
    return year >= MIN_DUE_YEAR && year <= MAX_DUE_YEAR
}

/**
 * Parses a due date submitted by a user (`<input type="date">` or ISO).
 * Empty input means "clear the date" (`null`); `undefined` means the value is
 * unusable and the caller should reject it.
 */
export function parseDueDate(value: string): Date | null | undefined {
    if (!value) return null
    const date = new Date(value)
    return isValidDueDate(date) ? date : undefined
}

/**
 * Due date from a third-party feed (CSV, Trello, a Stackboard export). Imports
 * are best-effort, so an unusable value becomes "no date" instead of failing
 * the whole import.
 */
export function coerceDueDate(value: string | null | undefined): Date | null {
    return (value ? parseDueDate(value) : null) ?? null
}

/** ISO string for a stored due date, or null when the row holds garbage. */
export function dueDateToIso(date: Date | null | undefined): string | null {
    return isValidDueDate(date) ? date.toISOString() : null
}

function isSameUtcDay(a: Date, b: Date): boolean {
    return (
        a.getUTCFullYear() === b.getUTCFullYear() &&
        a.getUTCMonth() === b.getUTCMonth() &&
        a.getUTCDate() === b.getUTCDate()
    )
}

export function bucketByDue<T extends { dueDate: Date | null }>(
    items: readonly T[],
    now: Date = new Date()
): DueBuckets<T> {
    const buckets: DueBuckets<T> = {
        overdue: [],
        today: [],
        thisWeek: [],
        later: [],
        noDate: [],
    }

    for (const item of items) {
        if (!isValidDueDate(item.dueDate)) {
            buckets.noDate.push(item)
        } else if (isOverdue(item.dueDate, now)) {
            buckets.overdue.push(item)
        } else if (isSameUtcDay(item.dueDate, now)) {
            buckets.today.push(item)
        } else if (item.dueDate.getTime() - now.getTime() <= WEEK_MS) {
            buckets.thisWeek.push(item)
        } else {
            buckets.later.push(item)
        }
    }

    for (const key of DUE_BUCKETS) {
        if (key === 'noDate') continue
        buckets[key].sort(
            (a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0)
        )
    }

    return buckets
}
