import 'server-only'
import { and, asc, eq } from 'drizzle-orm'
import { db, schema } from '@/db'

export async function getBoardGanttCards(boardId: string) {
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
            startDate: schema.cards.startDate,
            dueDate: schema.cards.dueDate,
        })
        .from(schema.cards)
        .where(
            and(
                eq(schema.cards.boardId, boardId),
                eq(schema.cards.status, 'active')
            )
        )
        .orderBy(asc(schema.cards.position))

    return { columns, cards }
}
