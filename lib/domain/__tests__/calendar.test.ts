import { describe, expect, it } from 'vitest'
import { dateKey, getMonthGridDays, groupCardsByDueDate } from '../calendar'

describe('getMonthGridDays', () => {
    it('pads to full Monday-first weeks', () => {
        // February 2026: 1st is a Sunday, 28th is a Saturday.
        const days = getMonthGridDays(2026, 1)
        expect(days.length % 7).toBe(0)
        expect(days[0].date.getUTCDay()).toBe(1) // Monday
        expect(days.at(-1)!.date.getUTCDay()).toBe(0) // Sunday
    })

    it('marks only the requested month as inMonth', () => {
        const days = getMonthGridDays(2026, 1)
        const inMonthDays = days.filter((d) => d.inMonth)
        expect(inMonthDays).toHaveLength(28)
        expect(inMonthDays.every((d) => d.date.getUTCMonth() === 1)).toBe(true)
    })

    it('covers a month that starts on Monday with no leading padding', () => {
        // June 2026 starts on a Monday.
        const days = getMonthGridDays(2026, 5)
        expect(days[0].inMonth).toBe(true)
        expect(days[0].date.getUTCDate()).toBe(1)
    })
})

describe('dateKey', () => {
    it('formats as YYYY-MM-DD in UTC', () => {
        expect(dateKey(new Date('2026-03-05T23:00:00Z'))).toBe('2026-03-05')
    })
})

describe('groupCardsByDueDate', () => {
    it('groups cards under their due-date day', () => {
        const cards = [
            { id: '1', dueDate: new Date('2026-03-05T10:00:00Z') },
            { id: '2', dueDate: new Date('2026-03-05T22:00:00Z') },
            { id: '3', dueDate: new Date('2026-03-06T00:00:00Z') },
        ]
        const grouped = groupCardsByDueDate(cards)
        expect(grouped.get('2026-03-05')).toHaveLength(2)
        expect(grouped.get('2026-03-06')).toHaveLength(1)
    })

    it('drops cards with no due date', () => {
        const grouped = groupCardsByDueDate([{ id: '1', dueDate: null }])
        expect(grouped.size).toBe(0)
    })
})
