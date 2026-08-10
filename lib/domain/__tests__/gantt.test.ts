import { describe, expect, it } from 'vitest'
import {
    barLayout,
    cardBarBounds,
    deriveDateRange,
    todayOffsetPct,
} from '../gantt'

describe('cardBarBounds', () => {
    it('spans startDate to dueDate when both are set', () => {
        const bounds = cardBarBounds({
            startDate: new Date('2026-03-01T00:00:00Z'),
            dueDate: new Date('2026-03-05T00:00:00Z'),
        })
        expect(bounds).toEqual({
            start: new Date('2026-03-01T00:00:00Z'),
            end: new Date('2026-03-05T00:00:00Z'),
        })
    })

    it('swaps out-of-order dates so start is never after end', () => {
        const bounds = cardBarBounds({
            startDate: new Date('2026-03-05T00:00:00Z'),
            dueDate: new Date('2026-03-01T00:00:00Z'),
        })
        expect(bounds).toEqual({
            start: new Date('2026-03-01T00:00:00Z'),
            end: new Date('2026-03-05T00:00:00Z'),
        })
    })

    it('is a single-day bar when only dueDate is set', () => {
        const due = new Date('2026-03-05T00:00:00Z')
        expect(cardBarBounds({ startDate: null, dueDate: due })).toEqual({
            start: due,
            end: due,
        })
    })

    it('is null with no dates at all', () => {
        expect(cardBarBounds({ startDate: null, dueDate: null })).toBeNull()
    })
})

describe('deriveDateRange', () => {
    it('spans all bars plus today, with padding', () => {
        const today = new Date('2026-03-10T00:00:00Z')
        const range = deriveDateRange(
            [
                {
                    start: new Date('2026-03-01T00:00:00Z'),
                    end: new Date('2026-03-05T00:00:00Z'),
                },
            ],
            today,
            2
        )
        expect(range.start.getTime()).toBeLessThan(
            new Date('2026-03-01T00:00:00Z').getTime()
        )
        expect(range.end.getTime()).toBeGreaterThan(today.getTime())
    })

    it('falls back to a window around today with no cards', () => {
        const today = new Date('2026-03-10T00:00:00Z')
        const range = deriveDateRange([], today, 2)
        expect(range.start.getTime()).toBeLessThan(today.getTime())
        expect(range.end.getTime()).toBeGreaterThan(today.getTime())
    })
})

describe('barLayout', () => {
    const range = {
        start: new Date('2026-03-01T00:00:00Z'),
        end: new Date('2026-03-11T00:00:00Z'), // 10 days
    }

    it('positions a bar proportionally within the range', () => {
        const { offsetPct, widthPct } = barLayout(range, {
            start: new Date('2026-03-03T00:00:00Z'),
            end: new Date('2026-03-05T00:00:00Z'),
        })
        expect(offsetPct).toBeCloseTo(20, 5)
        expect(widthPct).toBeCloseTo(20, 5)
    })

    it('clamps a bar that starts before the range', () => {
        const { offsetPct } = barLayout(range, {
            start: new Date('2026-02-20T00:00:00Z'),
            end: new Date('2026-03-03T00:00:00Z'),
        })
        expect(offsetPct).toBe(0)
    })

    it('gives a single-day bar a minimum visible width', () => {
        const { widthPct } = barLayout(range, {
            start: new Date('2026-03-05T00:00:00Z'),
            end: new Date('2026-03-05T00:00:00Z'),
        })
        expect(widthPct).toBeGreaterThan(0)
    })
})

describe('todayOffsetPct', () => {
    it('is 50% at the midpoint of the range', () => {
        const range = {
            start: new Date('2026-03-01T00:00:00Z'),
            end: new Date('2026-03-11T00:00:00Z'),
        }
        expect(
            todayOffsetPct(range, new Date('2026-03-06T00:00:00Z'))
        ).toBeCloseTo(50, 5)
    })

    it('clamps to 0-100 outside the range', () => {
        const range = {
            start: new Date('2026-03-01T00:00:00Z'),
            end: new Date('2026-03-11T00:00:00Z'),
        }
        expect(todayOffsetPct(range, new Date('2026-01-01T00:00:00Z'))).toBe(0)
        expect(todayOffsetPct(range, new Date('2027-01-01T00:00:00Z'))).toBe(
            100
        )
    })
})
