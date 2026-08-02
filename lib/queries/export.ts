import 'server-only'
import { asc, eq, inArray } from 'drizzle-orm'
import { db, schema } from '@/db'
import { getBoard, getBoardLabels } from './board'
import { STACKBOARD_EXPORT_FORMAT } from '@/lib/import/stackboard'

export async function getBoardExportData(boardId: string) {
    const board = await getBoard(boardId)
    if (!board) return null

    const [columns, labels, cards] = await Promise.all([
        db
            .select()
            .from(schema.columns)
            .where(eq(schema.columns.boardId, boardId))
            .orderBy(asc(schema.columns.position)),
        getBoardLabels(boardId),
        db
            .select()
            .from(schema.cards)
            .where(eq(schema.cards.boardId, boardId))
            .orderBy(asc(schema.cards.position)),
    ])

    const columnIndexById = new Map(columns.map((c, i) => [c.id, i]))
    const labelIndexById = new Map(labels.map((l, i) => [l.id, i]))

    const cardIds = cards.map((c) => c.id)
    const [cardLabelRows, checklistRows, commentRows] = cardIds.length
        ? await Promise.all([
              db
                  .select()
                  .from(schema.cardLabels)
                  .where(inArray(schema.cardLabels.cardId, cardIds)),
              db
                  .select()
                  .from(schema.checklistItems)
                  .where(inArray(schema.checklistItems.cardId, cardIds))
                  .orderBy(asc(schema.checklistItems.position)),
              db
                  .select()
                  .from(schema.comments)
                  .where(inArray(schema.comments.cardId, cardIds))
                  .orderBy(asc(schema.comments.createdAt)),
          ])
        : [[], [], []]

    const labelsByCard = new Map<string, string[]>()
    for (const row of cardLabelRows) {
        const list = labelsByCard.get(row.cardId) ?? []
        list.push(row.labelId)
        labelsByCard.set(row.cardId, list)
    }
    const checklistByCard = new Map<string, { text: string; done: boolean }[]>()
    for (const row of checklistRows) {
        const list = checklistByCard.get(row.cardId) ?? []
        list.push({ text: row.text, done: row.done })
        checklistByCard.set(row.cardId, list)
    }
    const commentsByCard = new Map<string, { body: string }[]>()
    for (const row of commentRows) {
        const list = commentsByCard.get(row.cardId) ?? []
        list.push({ body: row.body })
        commentsByCard.set(row.cardId, list)
    }

    return {
        format: STACKBOARD_EXPORT_FORMAT,
        version: 1,
        board: { name: board.name },
        columns: columns.map((c) => ({ name: c.name, status: c.status })),
        labels: labels.map((l) => ({ name: l.name, color: l.color })),
        cards: cards.map((card) => ({
            columnIndex: columnIndexById.get(card.columnId) ?? 0,
            title: card.title,
            description: card.description,
            status: card.status,
            dueDate: card.dueDate ? card.dueDate.toISOString() : null,
            labelIndexes: (labelsByCard.get(card.id) ?? [])
                .map((labelId) => labelIndexById.get(labelId))
                .filter((i): i is number => i !== undefined),
            checklist: checklistByCard.get(card.id) ?? [],
            comments: commentsByCard.get(card.id) ?? [],
        })),
    }
}
