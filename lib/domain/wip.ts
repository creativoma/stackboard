/**
 * WIP (work-in-progress) limit rules for columns.
 *
 * A limit only blocks cards *entering* a column (create, move-in, restore) —
 * it never blocks moves out or leaves a column in an unfixable state. A
 * column can therefore sit over its limit (e.g. the limit was lowered after
 * the fact); `isOverLimit` exists so the UI can flag that state.
 */

/** May one more active card enter a column that currently holds `activeCount`? */
export function canAcceptCard(
    activeCount: number,
    wipLimit: number | null
): boolean {
    if (wipLimit === null || wipLimit <= 0) return true
    return activeCount < wipLimit
}

/** Strictly above the limit — used for the red badge, never for blocking. */
export function isOverLimit(
    activeCount: number,
    wipLimit: number | null
): boolean {
    if (wipLimit === null || wipLimit <= 0) return false
    return activeCount > wipLimit
}

export const MAX_WIP_LIMIT = 1000

/**
 * Parse a form value into a stored limit: a positive integer capped at
 * MAX_WIP_LIMIT, or null for "no limit" (empty, zero, negative, or junk).
 */
export function parseWipLimit(raw: string): number | null {
    if (!/^\d+$/.test(raw.trim())) return null
    const value = Number(raw.trim())
    if (!Number.isInteger(value) || value <= 0) return null
    return Math.min(value, MAX_WIP_LIMIT)
}
