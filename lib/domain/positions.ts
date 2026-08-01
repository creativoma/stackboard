/**
 * Position math for columns, cards, and checklist items.
 *
 * We store explicit contiguous integer positions (0..n-1) per parent
 * (board for columns, column for cards, card for checklist items) rather
 * than fractional/gap-based positions. A move always recomputes the full
 * ordering for the affected list(s), which the caller persists atomically
 * in a single transaction. This trades a few extra row writes per move for
 * positions that can never drift or collide.
 */

export function clampIndex(index: number, length: number): number {
    if (index < 0) return 0
    if (index > length) return length
    return index
}

/** Reorder a single list: remove `id`, then reinsert it at `destIndex`. */
export function reorderWithinList(
    ids: readonly string[],
    id: string,
    destIndex: number
): string[] {
    const without = ids.filter((x) => x !== id)
    const index = clampIndex(destIndex, without.length)
    return [...without.slice(0, index), id, ...without.slice(index)]
}

/**
 * Move `id` out of `sourceIds` and into `destIds` at `destIndex`.
 * Returns the two updated lists. If source and dest are the same list,
 * use `reorderWithinList` instead.
 */
export function moveBetweenLists(
    sourceIds: readonly string[],
    destIds: readonly string[],
    id: string,
    destIndex: number
): { source: string[]; dest: string[] } {
    const source = sourceIds.filter((x) => x !== id)
    const destWithout = destIds.filter((x) => x !== id)
    const index = clampIndex(destIndex, destWithout.length)
    const dest = [
        ...destWithout.slice(0, index),
        id,
        ...destWithout.slice(index),
    ]
    return { source, dest }
}

/** Turn an ordered id list into {id, position} rows ready to persist. */
export function toPositionRows(
    ids: readonly string[]
): { id: string; position: number }[] {
    return ids.map((id, position) => ({ id, position }))
}

/** Position for a brand-new item appended to the end of a list. */
export function nextPosition(existingCount: number): number {
    return existingCount
}
