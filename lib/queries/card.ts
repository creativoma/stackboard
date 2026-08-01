import 'server-only'
import { and, asc, desc, eq } from 'drizzle-orm'
import { db, schema } from '@/db'

export async function getCardDetail(boardId: string, cardId: string) {
    const [card] = await db
        .select()
        .from(schema.cards)
        .where(
            and(eq(schema.cards.id, cardId), eq(schema.cards.boardId, boardId))
        )
        .limit(1)
    if (!card) return null

    const [checklistItems, cardLabelRows, comments, activity, column] =
        await Promise.all([
            db
                .select()
                .from(schema.checklistItems)
                .where(eq(schema.checklistItems.cardId, cardId))
                .orderBy(asc(schema.checklistItems.position)),
            db
                .select()
                .from(schema.cardLabels)
                .where(eq(schema.cardLabels.cardId, cardId)),
            db
                .select({ comment: schema.comments, author: schema.users })
                .from(schema.comments)
                .innerJoin(
                    schema.users,
                    eq(schema.users.id, schema.comments.authorId)
                )
                .where(eq(schema.comments.cardId, cardId))
                .orderBy(asc(schema.comments.createdAt)),
            db
                .select({ event: schema.activityEvents, actor: schema.users })
                .from(schema.activityEvents)
                .innerJoin(
                    schema.users,
                    eq(schema.users.id, schema.activityEvents.actorId)
                )
                .where(eq(schema.activityEvents.cardId, cardId))
                .orderBy(desc(schema.activityEvents.createdAt)),
            db
                .select()
                .from(schema.columns)
                .where(eq(schema.columns.id, card.columnId))
                .limit(1),
        ])

    return {
        card,
        column: column[0] ?? null,
        checklistItems,
        labelIds: cardLabelRows.map((r) => r.labelId),
        comments,
        activity,
    }
}
