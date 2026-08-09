import 'server-only'
import { and, count, desc, eq, isNull } from 'drizzle-orm'
import { db, schema } from '@/db'

export async function countUnreadNotifications(userId: string) {
    const [{ value }] = await db
        .select({ value: count() })
        .from(schema.notifications)
        .where(
            and(
                eq(schema.notifications.userId, userId),
                isNull(schema.notifications.readAt)
            )
        )
    return value
}

export async function listNotifications(userId: string, limit = 50) {
    return db
        .select({
            id: schema.notifications.id,
            boardId: schema.notifications.boardId,
            cardId: schema.notifications.cardId,
            type: schema.notifications.type,
            title: schema.notifications.title,
            readAt: schema.notifications.readAt,
            createdAt: schema.notifications.createdAt,
            actorName: schema.users.name,
            boardName: schema.boards.name,
        })
        .from(schema.notifications)
        .innerJoin(
            schema.users,
            eq(schema.users.id, schema.notifications.actorId)
        )
        .innerJoin(
            schema.boards,
            eq(schema.boards.id, schema.notifications.boardId)
        )
        .where(eq(schema.notifications.userId, userId))
        .orderBy(desc(schema.notifications.createdAt))
        .limit(limit)
}
