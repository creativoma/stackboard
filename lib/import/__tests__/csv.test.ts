import { describe, expect, it } from 'vitest'
import { boardExportToCsv, parseCsvImport } from '../csv'

const sampleExport = {
    board: { name: 'Website Redesign' },
    columns: [
        { name: 'To do', status: 'active' as const },
        { name: 'Blocked', status: 'archived' as const },
    ],
    labels: [
        { name: 'Bug', color: 'red' },
        { name: 'Design, urgent', color: 'purple' },
    ],
    cards: [
        {
            columnIndex: 0,
            title: 'Write copy "for real" this time',
            description: 'Multi-line\ndescription, with a comma',
            status: 'active' as const,
            dueDate: '2026-09-01T00:00:00.000Z',
            labelIndexes: [0, 1],
            checklist: [
                { text: 'Draft outline', done: true },
                { text: 'Get approval', done: false },
            ],
            comments: [{ body: 'First comment' }, { body: 'Second comment' }],
        },
        {
            columnIndex: 1,
            title: 'Archived task',
            description: '',
            status: 'archived' as const,
            dueDate: null,
            labelIndexes: [],
            checklist: [],
            comments: [],
        },
    ],
}

describe('boardExportToCsv / parseCsvImport round trip', () => {
    it('round-trips board name, columns, labels, and cards', () => {
        const csv = boardExportToCsv(sampleExport)
        const parsed = parseCsvImport(csv)

        expect(parsed.boardName).toBe('Website Redesign')
        expect(parsed.columns).toEqual(sampleExport.columns)
        expect(parsed.labels).toEqual(sampleExport.labels)
        expect(parsed.cards).toHaveLength(2)
    })

    it('preserves a quoted title, multi-line description with a comma, and due date', () => {
        const csv = boardExportToCsv(sampleExport)
        const [card] = parseCsvImport(csv).cards

        expect(card.title).toBe('Write copy "for real" this time')
        expect(card.description).toBe('Multi-line\ndescription, with a comma')
        expect(card.dueDate).toEqual(new Date('2026-09-01T00:00:00.000Z'))
        expect(card.columnIndex).toBe(0)
        expect(card.labelIndexes).toEqual([0, 1])
    })

    it('encodes checklist done state and decodes it back', () => {
        const csv = boardExportToCsv(sampleExport)
        const [card] = parseCsvImport(csv).cards

        expect(card.checklist).toEqual([
            { text: 'Draft outline', done: true },
            { text: 'Get approval', done: false },
        ])
    })

    it('joins and splits multiple comments on separate lines', () => {
        const csv = boardExportToCsv(sampleExport)
        const [card] = parseCsvImport(csv).cards

        expect(card.comments).toEqual([
            { body: 'First comment' },
            { body: 'Second comment' },
        ])
    })

    it('handles a card with no due date, labels, checklist, or comments', () => {
        const csv = boardExportToCsv(sampleExport)
        const [, archivedCard] = parseCsvImport(csv).cards

        expect(archivedCard.status).toBe('archived')
        expect(archivedCard.dueDate).toBeNull()
        expect(archivedCard.labelIndexes).toEqual([])
        expect(archivedCard.checklist).toEqual([])
        expect(archivedCard.comments).toEqual([])
    })

    it('rejects a CSV file missing the expected header', () => {
        expect(() => parseCsvImport('a,b,c\n1,2,3')).toThrow(
            /does not look like/
        )
    })

    it('rejects a CSV file with no column rows', () => {
        const csv = boardExportToCsv({ ...sampleExport, columns: [] })
        expect(() => parseCsvImport(csv)).toThrow(/no columns/)
    })

    it('rejects a card title over the 200-character limit', () => {
        const csv = boardExportToCsv({
            ...sampleExport,
            cards: [
                {
                    ...sampleExport.cards[0],
                    title: 'x'.repeat(201),
                },
            ],
        })
        expect(() => parseCsvImport(csv)).toThrow(/too long/)
    })
})
