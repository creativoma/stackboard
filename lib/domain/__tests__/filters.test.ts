import { describe, expect, it } from 'vitest'
import { isOverdue, matchesFilters } from '../filters'

const baseCard = {
    title: 'Fix login bug',
    description: 'Users cannot log in on Safari',
    assigneeId: 'user-1',
    dueDate: null as Date | null,
    priority: null as string | null,
    labelIds: ['label-1'],
}

describe('isOverdue', () => {
    it('is false when there is no due date', () => {
        expect(isOverdue(null)).toBe(false)
    })

    it('is true when the due date is in the past', () => {
        expect(isOverdue(new Date('2020-01-01'), new Date('2024-01-01'))).toBe(
            true
        )
    })

    it('is false when the due date is in the future', () => {
        expect(isOverdue(new Date('2025-01-01'), new Date('2024-01-01'))).toBe(
            false
        )
    })
})

describe('matchesFilters', () => {
    it('matches everything when no filters are set', () => {
        expect(matchesFilters(baseCard, {})).toBe(true)
    })

    it('filters by assignee', () => {
        expect(matchesFilters(baseCard, { member: 'user-1' })).toBe(true)
        expect(matchesFilters(baseCard, { member: 'user-2' })).toBe(false)
    })

    it('filters by label', () => {
        expect(matchesFilters(baseCard, { label: 'label-1' })).toBe(true)
        expect(matchesFilters(baseCard, { label: 'label-9' })).toBe(false)
    })

    it('filters by priority; cards without one never match a priority filter', () => {
        const highCard = { ...baseCard, priority: 'high' }
        expect(matchesFilters(highCard, { priority: 'high' })).toBe(true)
        expect(matchesFilters(highCard, { priority: 'low' })).toBe(false)
        expect(matchesFilters(baseCard, { priority: 'high' })).toBe(false)
    })

    it('filters by overdue using the supplied now', () => {
        const overdueCard = { ...baseCard, dueDate: new Date('2020-01-01') }
        expect(
            matchesFilters(
                overdueCard,
                { overdue: true },
                new Date('2024-01-01')
            )
        ).toBe(true)
        expect(
            matchesFilters(baseCard, { overdue: true }, new Date('2024-01-01'))
        ).toBe(false)
    })

    it('filters by keyword across title and description, case-insensitively', () => {
        expect(matchesFilters(baseCard, { q: 'LOGIN' })).toBe(true)
        expect(matchesFilters(baseCard, { q: 'safari' })).toBe(true)
        expect(matchesFilters(baseCard, { q: 'checkout' })).toBe(false)
    })

    it('combines multiple filters with AND semantics', () => {
        expect(matchesFilters(baseCard, { member: 'user-1', q: 'login' })).toBe(
            true
        )
        expect(matchesFilters(baseCard, { member: 'user-2', q: 'login' })).toBe(
            false
        )
    })
})
