/**
 * Pure date-grid math for the board calendar view. All arithmetic happens in
 * UTC day buckets so a card's due date (stored with a timezone but rendered
 * as a plain date) always lands in exactly one cell, regardless of the
 * server's local timezone.
 */

export type MonthGridDay = { date: Date; inMonth: boolean }

/** Monday-first day index, 0-6. */
function mondayIndex(date: Date): number {
    return (date.getUTCDay() + 6) % 7
}

export function dateKey(date: Date): string {
    return date.toISOString().slice(0, 10)
}

/**
 * Every day cell for a month's calendar grid, padded to full weeks with the
 * trailing days of the previous/next month (`inMonth: false`).
 */
export function getMonthGridDays(year: number, month: number): MonthGridDay[] {
    const firstOfMonth = new Date(Date.UTC(year, month, 1))
    const start = new Date(firstOfMonth)
    start.setUTCDate(start.getUTCDate() - mondayIndex(firstOfMonth))

    const lastOfMonth = new Date(Date.UTC(year, month + 1, 0))
    const end = new Date(lastOfMonth)
    end.setUTCDate(end.getUTCDate() + (6 - mondayIndex(lastOfMonth)))

    const days: MonthGridDay[] = []
    const cursor = new Date(start)
    while (cursor.getTime() <= end.getTime()) {
        days.push({
            date: new Date(cursor),
            inMonth: cursor.getUTCMonth() === month,
        })
        cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    return days
}

/** Group cards by their due-date day, dropping cards with no due date. */
export function groupCardsByDueDate<T extends { dueDate: Date | null }>(
    cards: readonly T[]
): Map<string, T[]> {
    const map = new Map<string, T[]>()
    for (const card of cards) {
        if (!card.dueDate) continue
        const key = dateKey(card.dueDate)
        const list = map.get(key) ?? []
        list.push(card)
        map.set(key, list)
    }
    return map
}
