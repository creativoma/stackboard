import { z } from 'zod'
import type { NormalizedImport } from './types'

export const CREATIVODECK_EXPORT_FORMAT = 'creativodeck-board-export'

export function isCreativodeckExport(raw: unknown): boolean {
    return (
        typeof raw === 'object' &&
        raw !== null &&
        (raw as Record<string, unknown>).format === CREATIVODECK_EXPORT_FORMAT
    )
}

const schema = z.object({
    format: z.literal(CREATIVODECK_EXPORT_FORMAT),
    board: z.object({ name: z.string().trim().min(1).max(100) }),
    columns: z.array(
        z.object({
            name: z.string().trim().min(1).max(60),
            status: z.enum(['active', 'archived']),
        })
    ),
    labels: z.array(
        z.object({
            name: z.string().trim().min(1).max(60),
            color: z.string().trim().min(1),
        })
    ),
    cards: z.array(
        z.object({
            columnIndex: z.number().int().min(0),
            title: z.string().trim().min(1).max(200),
            description: z.string(),
            status: z.enum(['active', 'archived']),
            dueDate: z.string().nullable(),
            labelIndexes: z.array(z.number().int().min(0)),
            checklist: z.array(
                z.object({ text: z.string(), done: z.boolean() })
            ),
            comments: z.array(z.object({ body: z.string() })),
        })
    ),
})

export function parseCreativodeckExport(raw: unknown): NormalizedImport {
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
        throw new Error('This file is not a valid creativodeck board export.')
    }
    const { board, columns, labels, cards } = parsed.data

    const positionByColumn = new Map<number, number>()

    return {
        boardName: board.name,
        columns,
        labels,
        cards: cards.map((card) => {
            const position = positionByColumn.get(card.columnIndex) ?? 0
            positionByColumn.set(card.columnIndex, position + 1)
            return {
                columnIndex: card.columnIndex,
                position,
                title: card.title,
                description: card.description,
                status: card.status,
                dueDate: card.dueDate ? new Date(card.dueDate) : null,
                labelIndexes: card.labelIndexes,
                checklist: card.checklist,
                comments: card.comments,
            }
        }),
    }
}
