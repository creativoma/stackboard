import 'server-only'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db, schema } from '@/db'

/** Only ever called with a token straight from the URL — never trust it unvalidated elsewhere. */
export async function getBoardByPublicToken(token: string) {
    const [board] = await db
        .select()
        .from(schema.boards)
        .where(
            and(
                eq(schema.boards.publicToken, token),
                eq(schema.boards.status, 'active')
            )
        )
        .limit(1)
    return board ?? null
}

/**
 * Read-only board contents for the public link. Deliberately narrower than
 * the authenticated board view: no assignee names, comments, attachments,
 * or activity trail — just enough to see progress at a glance (see README
 * Security decisions).
 */
export async function getPublicBoardView(boardId: string) {
    const columns = await db
        .select({
            id: schema.columns.id,
            name: schema.columns.name,
            position: schema.columns.position,
        })
        .from(schema.columns)
        .where(
            and(
                eq(schema.columns.boardId, boardId),
                eq(schema.columns.status, 'active')
            )
        )
        .orderBy(asc(schema.columns.position))

    const cards = await db
        .select({
            id: schema.cards.id,
            columnId: schema.cards.columnId,
            title: schema.cards.title,
            priority: schema.cards.priority,
            dueDate: schema.cards.dueDate,
            position: schema.cards.position,
        })
        .from(schema.cards)
        .where(
            and(
                eq(schema.cards.boardId, boardId),
                eq(schema.cards.status, 'active')
            )
        )
        .orderBy(asc(schema.cards.position))

    const cardIds = cards.map((c) => c.id)
    const checklistRows = cardIds.length
        ? await db
              .select()
              .from(schema.checklistItems)
              .where(inArray(schema.checklistItems.cardId, cardIds))
        : []
    const checklistByCard = new Map<string, { total: number; done: number }>()
    for (const row of checklistRows) {
        const entry = checklistByCard.get(row.cardId) ?? {
            total: 0,
            done: 0,
        }
        entry.total += 1
        if (row.done) entry.done += 1
        checklistByCard.set(row.cardId, entry)
    }

    return {
        columns,
        cards: cards.map((c) => ({
            ...c,
            checklist: checklistByCard.get(c.id) ?? { total: 0, done: 0 },
        })),
    }
}
