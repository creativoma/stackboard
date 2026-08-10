/**
 * Aggregation helpers for the board analytics dashboard. Pure/no I/O — the
 * query layer (lib/queries/board.ts#getActiveColumnsWithCards) already does
 * the DB round trip; this just tallies what it returns.
 */

/** Count items by a derived key, preserving every key it ever sees. */
export function tally<T>(
    items: readonly T[],
    keyFn: (item: T) => string
): Map<string, number> {
    const counts = new Map<string, number>()
    for (const item of items) {
        const key = keyFn(item)
        counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
}

export function checklistTotals<
    T extends { checklist: { total: number; done: number } },
>(cards: readonly T[]): { total: number; done: number } {
    return cards.reduce(
        (acc, c) => ({
            total: acc.total + c.checklist.total,
            done: acc.done + c.checklist.done,
        }),
        { total: 0, done: 0 }
    )
}
