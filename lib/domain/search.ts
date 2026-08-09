/**
 * Query normalization for card search. The SQL side (lib/queries/search.ts)
 * only ever receives a normalized, length-bounded string or nothing at all.
 */

export const MAX_SEARCH_QUERY_LENGTH = 200

/** Trim/collapse whitespace; null means "don't search" (empty or too short). */
export function normalizeSearchQuery(raw: string): string | null {
    const collapsed = raw.trim().replace(/\s+/g, ' ')
    if (collapsed.length < 2) return null
    return collapsed.slice(0, MAX_SEARCH_QUERY_LENGTH)
}
