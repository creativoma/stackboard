import { describe, expect, it } from 'vitest'
import { BOARD_TEMPLATES, getBoardTemplate } from '../boards'
import { LABEL_COLOR_VAR } from '@/lib/labels'

describe('board templates', () => {
    it('exposes unique keys and resolvable lookups', () => {
        const keys = BOARD_TEMPLATES.map((t) => t.key)
        expect(new Set(keys).size).toBe(keys.length)
        for (const key of keys) {
            expect(getBoardTemplate(key)?.key).toBe(key)
        }
        expect(getBoardTemplate('nope')).toBeUndefined()
    })

    it.each(BOARD_TEMPLATES.map((t) => [t.key, t] as const))(
        'template "%s" is internally consistent',
        (_key, template) => {
            const { board } = template
            expect(board.boardName.length).toBeGreaterThan(0)
            expect(board.boardName.length).toBeLessThanOrEqual(100)
            expect(board.columns.length).toBeGreaterThan(0)

            for (const column of board.columns) {
                expect(column.name.length).toBeGreaterThan(0)
                expect(column.name.length).toBeLessThanOrEqual(60)
            }
            for (const label of board.labels) {
                // Colors must come from the fixed functional palette.
                expect(Object.keys(LABEL_COLOR_VAR)).toContain(label.color)
            }
            for (const card of board.cards) {
                expect(board.columns[card.columnIndex]).toBeDefined()
                expect(card.title.length).toBeGreaterThan(0)
                expect(card.title.length).toBeLessThanOrEqual(200)
                for (const labelIndex of card.labelIndexes) {
                    expect(board.labels[labelIndex]).toBeDefined()
                }
            }
        }
    )
})
