export type DependencyEdge = { blockerCardId: string; blockedCardId: string }

/**
 * Would adding `candidate` (blockerCardId must finish before blockedCardId
 * can start) create a cycle given the board's existing edges?
 *
 * True for a direct self-dependency, or when `blockedCardId` can already
 * reach `blockerCardId` by following existing "blocks" edges — meaning it
 * already (transitively) blocks the card that's about to block it.
 */
export function wouldCreateCycle(
    edges: readonly DependencyEdge[],
    candidate: DependencyEdge
): boolean {
    if (candidate.blockerCardId === candidate.blockedCardId) return true

    const outEdges = new Map<string, string[]>()
    for (const edge of edges) {
        const list = outEdges.get(edge.blockerCardId) ?? []
        list.push(edge.blockedCardId)
        outEdges.set(edge.blockerCardId, list)
    }

    const seen = new Set<string>([candidate.blockedCardId])
    const queue = [candidate.blockedCardId]
    while (queue.length > 0) {
        const node = queue.shift()!
        if (node === candidate.blockerCardId) return true
        for (const next of outEdges.get(node) ?? []) {
            if (!seen.has(next)) {
                seen.add(next)
                queue.push(next)
            }
        }
    }
    return false
}
