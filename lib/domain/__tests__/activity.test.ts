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

    it('describes an assignee change with names, never ids', () => {
        expect(
            describeActivity({
                type: 'card.field_changed',
                field: 'assignee',
                oldValue: 'Alice Owens',
                newValue: 'Bob Chen',
            })
        ).toBe('changed the assignee from "Alice Owens" to "Bob Chen"')
    })

    it('describes setting a field with no previous value', () => {
        expect(
            describeActivity({
                type: 'card.field_changed',
                field: 'assignee',
                oldValue: null,
                newValue: 'Bob Chen',
            })
        ).toBe('set the assignee to "Bob Chen"')
    })

    it('describes removing a field value', () => {
        expect(
            describeActivity({
                type: 'card.field_changed',
                field: 'due date',
                oldValue: '2026-08-06',
                newValue: null,
            })
        ).toBe('removed the due date')
    })

    it('describes creating a label', () => {
        expect(
            describeActivity({ type: 'label.created', newValue: 'Bug' })
        ).toBe('created label "Bug"')
    })

    it('describes recoloring a label by name', () => {
        expect(
            describeActivity({
                type: 'label.updated',
                field: 'Bug',
                oldValue: 'red',
                newValue: 'blue',
            })
        ).toBe('changed the color of "Bug" to blue')
    })

    it('describes deleting a label', () => {
        expect(
            describeActivity({ type: 'label.deleted', oldValue: 'Bug' })
        ).toBe('deleted label "Bug"')
    })

    it('never leaks description bodies into the timeline', () => {
        expect(
            describeActivity({
                type: 'card.field_changed',
                field: 'description',
                oldValue: null,
                newValue: null,
            })
        ).toBe('updated the description')
    })
})
