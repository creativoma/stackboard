import { describe, expect, it } from 'vitest'
import { checklistTotals, tally } from '../analytics'

describe('tally', () => {
    it('counts items by key', () => {
        const items = ['a', 'b', 'a', 'c', 'a']
        const counts = tally(items, (x) => x)
        expect(counts.get('a')).toBe(3)
        expect(counts.get('b')).toBe(1)
        expect(counts.get('c')).toBe(1)
    })

    it('returns an empty map for no items', () => {
        expect(tally([], (x: string) => x).size).toBe(0)
    })
})

describe('checklistTotals', () => {
    it('sums total and done across cards', () => {
        const cards = [
            { checklist: { total: 3, done: 1 } },
            { checklist: { total: 2, done: 2 } },
            { checklist: { total: 0, done: 0 } },
        ]
        expect(checklistTotals(cards)).toEqual({ total: 5, done: 3 })
    })

    it('handles no cards', () => {
        expect(checklistTotals([])).toEqual({ total: 0, done: 0 })
    })
})
