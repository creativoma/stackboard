import 'server-only'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/db'

export type MyCard = {
    cardId: string
    boardId: string
    title: string
    dueDate: Date | null
    boardName: string
    columnName: string
}

/**
 * Active cards assigned to the user across every active board where their
 * membership is still active. Feeds the "My cards" page, bucketed by
 * lib/domain/due.ts.
 */
export async function listMyCards(userId: string): Promise<MyCard[]> {
    return db
        .select({
            cardId: schema.cards.id,
            boardId: schema.cards.boardId,
            title: schema.cards.title,
            dueDate: schema.cards.dueDate,
            boardName: schema.boards.name,
            columnName: schema.columns.name,
        })
        .from(schema.cards)
        .innerJoin(schema.boards, eq(schema.boards.id, schema.cards.boardId))
        .innerJoin(schema.columns, eq(schema.columns.id, schema.cards.columnId))
        .innerJoin(
            schema.boardMemberships,
            eq(schema.boardMemberships.boardId, schema.cards.boardId)
        )
        .where(
            and(
                eq(schema.cards.assigneeId, userId),
                eq(schema.cards.status, 'active'),
                eq(schema.boards.status, 'active'),
                eq(schema.boardMemberships.userId, userId),
                eq(schema.boardMemberships.status, 'active')
            )
        )
}
