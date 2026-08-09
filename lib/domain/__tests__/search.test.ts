import { describe, expect, it } from 'vitest'
import { normalizeSearchQuery } from '../search'

describe('normalizeSearchQuery', () => {
    it('trims and collapses internal whitespace', () => {
        expect(normalizeSearchQuery('  launch   plan ')).toBe('launch plan')
    })

    it('returns null for empty or whitespace-only input', () => {
        expect(normalizeSearchQuery('')).toBe(null)
        expect(normalizeSearchQuery('   ')).toBe(null)
    })

    it('returns null for a single character (too broad to search)', () => {
        expect(normalizeSearchQuery('a')).toBe(null)
    })

    it('caps overly long queries at 200 characters', () => {
        const q = 'x'.repeat(500)
        expect(normalizeSearchQuery(q)).toHaveLength(200)
    })
})
