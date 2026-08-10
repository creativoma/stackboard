import 'server-only'
import { and, asc, desc, eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { humanizeActivityValues } from './activity'

export async function getCardDetail(boardId: string, cardId: string) {
    const [card] = await db
        .select()
        .from(schema.cards)
        .where(
            and(eq(schema.cards.id, cardId), eq(schema.cards.boardId, boardId))
        )
        .limit(1)
    if (!card) return null

    const [
        checklistItems,
        cardLabelRows,
        comments,
        activity,
        column,
        parentCardRows,
        subtasks,
        blockedByRows,
        blocksRows,
    ] = await Promise.all([
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
        card.parentCardId
            ? db
                  .select({ id: schema.cards.id, title: schema.cards.title })
                  .from(schema.cards)
                  .where(eq(schema.cards.id, card.parentCardId))
                  .limit(1)
            : Promise.resolve([]),
        db
            .select({
                id: schema.cards.id,
                title: schema.cards.title,
                status: schema.cards.status,
            })
            .from(schema.cards)
            .where(eq(schema.cards.parentCardId, cardId))
            .orderBy(asc(schema.cards.createdAt)),
        db
            .select({
                dependencyId: schema.cardDependencies.id,
                id: schema.cards.id,
                title: schema.cards.title,
                status: schema.cards.status,
            })
            .from(schema.cardDependencies)
            .innerJoin(
                schema.cards,
                eq(schema.cards.id, schema.cardDependencies.blockerCardId)
            )
            .where(eq(schema.cardDependencies.blockedCardId, cardId)),
        db
            .select({
                dependencyId: schema.cardDependencies.id,
                id: schema.cards.id,
                title: schema.cards.title,
                status: schema.cards.status,
            })
            .from(schema.cardDependencies)
            .innerJoin(
                schema.cards,
                eq(schema.cards.id, schema.cardDependencies.blockedCardId)
            )
            .where(eq(schema.cardDependencies.blockerCardId, cardId)),
    ])

    const humanizedEvents = await humanizeActivityValues(
        activity.map((a) => a.event)
    )

    return {
        card,
        column: column[0] ?? null,
        checklistItems,
        labelIds: cardLabelRows.map((r) => r.labelId),
        comments,
        activity: activity.map((a, i) => ({
            ...a,
            event: humanizedEvents[i],
        })),
        parentCard: parentCardRows[0] ?? null,
        subtasks,
        blockedBy: blockedByRows,
        blocks: blocksRows,
    }
}

/** Active cards on a board, for "add subtask"/"add dependency" pickers. */
export async function getActiveCardOptions(boardId: string) {
    return db
        .select({ id: schema.cards.id, title: schema.cards.title })
        .from(schema.cards)
        .where(
            and(
                eq(schema.cards.boardId, boardId),
                eq(schema.cards.status, 'active')
            )
        )
        .orderBy(asc(schema.cards.title))
}

/** Every "blocks" edge on a board, for cycle-checking a new dependency. */
export async function getBoardDependencyEdges(boardId: string) {
    return db
        .select({
            blockerCardId: schema.cardDependencies.blockerCardId,
            blockedCardId: schema.cardDependencies.blockedCardId,
        })
        .from(schema.cardDependencies)
        .where(eq(schema.cardDependencies.boardId, boardId))
}

export async function getCardWatchers(cardId: string) {
    return db
        .select({ userId: schema.cardWatchers.userId })
        .from(schema.cardWatchers)
        .where(eq(schema.cardWatchers.cardId, cardId))
}

export async function getCardAttachments(cardId: string) {
    return db
        .select({
            id: schema.attachments.id,
            filename: schema.attachments.filename,
            mimeType: schema.attachments.mimeType,
            sizeBytes: schema.attachments.sizeBytes,
            uploaderId: schema.attachments.uploaderId,
            createdAt: schema.attachments.createdAt,
            uploaderName: schema.users.name,
        })
        .from(schema.attachments)
        .innerJoin(
            schema.users,
            eq(schema.users.id, schema.attachments.uploaderId)
        )
        .where(eq(schema.attachments.cardId, cardId))
        .orderBy(desc(schema.attachments.createdAt))
}
