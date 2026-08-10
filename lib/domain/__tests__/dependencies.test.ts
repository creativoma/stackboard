import { describe, expect, it } from 'vitest'
import { wouldCreateCycle } from '../dependencies'

describe('wouldCreateCycle', () => {
    it('rejects a card depending on itself', () => {
        expect(
            wouldCreateCycle([], { blockerCardId: 'a', blockedCardId: 'a' })
        ).toBe(true)
    })

    it('allows an edge with no existing relationship', () => {
        expect(
            wouldCreateCycle([], { blockerCardId: 'a', blockedCardId: 'b' })
        ).toBe(false)
    })

    it('rejects a direct back-edge (A blocks B, now B blocks A)', () => {
        const edges = [{ blockerCardId: 'a', blockedCardId: 'b' }]
        expect(
            wouldCreateCycle(edges, { blockerCardId: 'b', blockedCardId: 'a' })
        ).toBe(true)
    })

    it('rejects a transitive cycle (A blocks B blocks C, now C blocks A)', () => {
        const edges = [
            { blockerCardId: 'a', blockedCardId: 'b' },
            { blockerCardId: 'b', blockedCardId: 'c' },
        ]
        expect(
            wouldCreateCycle(edges, { blockerCardId: 'c', blockedCardId: 'a' })
        ).toBe(true)
    })

    it('allows a fresh edge alongside unrelated existing ones', () => {
        const edges = [{ blockerCardId: 'a', blockedCardId: 'b' }]
        expect(
            wouldCreateCycle(edges, { blockerCardId: 'x', blockedCardId: 'y' })
        ).toBe(false)
    })
})
