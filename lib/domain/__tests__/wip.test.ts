import { describe, expect, it } from 'vitest'
import { canAcceptCard, isOverLimit, parseWipLimit } from '../wip'

describe('canAcceptCard', () => {
    it('always accepts when there is no limit', () => {
        expect(canAcceptCard(0, null)).toBe(true)
        expect(canAcceptCard(999, null)).toBe(true)
    })

    it('accepts while below the limit', () => {
        expect(canAcceptCard(0, 3)).toBe(true)
        expect(canAcceptCard(2, 3)).toBe(true)
    })

    it('rejects when the column is at or over its limit', () => {
        expect(canAcceptCard(3, 3)).toBe(false)
        expect(canAcceptCard(5, 3)).toBe(false)
    })

    it('treats a zero or negative limit as no limit (never stored, but defensive)', () => {
        expect(canAcceptCard(10, 0)).toBe(true)
        expect(canAcceptCard(10, -1)).toBe(true)
    })
})

describe('isOverLimit', () => {
    it('is false with no limit', () => {
        expect(isOverLimit(50, null)).toBe(false)
    })

    it('is false at or below the limit', () => {
        expect(isOverLimit(3, 3)).toBe(false)
        expect(isOverLimit(2, 3)).toBe(false)
    })

    it('is true only strictly above the limit (a pre-existing overflow is shown, not blocked)', () => {
        expect(isOverLimit(4, 3)).toBe(true)
    })
})

describe('parseWipLimit', () => {
    it('parses a positive integer', () => {
        expect(parseWipLimit('5')).toBe(5)
    })

    it('maps empty, zero, negative, and junk input to null (no limit)', () => {
        expect(parseWipLimit('')).toBe(null)
        expect(parseWipLimit('0')).toBe(null)
        expect(parseWipLimit('-2')).toBe(null)
        expect(parseWipLimit('abc')).toBe(null)
        expect(parseWipLimit('2.7')).toBe(null)
    })

    it('caps absurd limits at 1000', () => {
        expect(parseWipLimit('99999')).toBe(1000)
    })
})
