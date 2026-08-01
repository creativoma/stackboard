import { describe, expect, it } from 'vitest'
import { describeActivity } from '../activity'

describe('describeActivity', () => {
    it('describes a card move with old and new column names', () => {
        const text = describeActivity({
            type: 'card.moved',
            oldValue: 'In progress',
            newValue: 'Done',
        })
        expect(text).toContain('In progress')
        expect(text).toContain('Done')
    })

    it('describes a card restore including the destination column', () => {
        const text = describeActivity({
            type: 'card.restored',
            newValue: 'To do',
        })
        expect(text).toBe('restored this card to "To do"')
    })

    it('falls back to the raw type for unknown activity types', () => {
        expect(describeActivity({ type: 'something.unmapped' })).toBe(
            'something.unmapped'
        )
    })
})
