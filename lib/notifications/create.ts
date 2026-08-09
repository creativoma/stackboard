import { inArray } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '@/db/schema'
import type { NotificationType } from '@/db/schema'
import { notificationEmailContent } from '@/lib/email/send'

// No `server-only` import — this module is shared by Server Actions and the
// standalone jobs worker (the due-soon scan), like lib/jobs/handlers.ts. It
// takes a db instance for the same reason as lib/jobs/worker.ts.
type Db = PostgresJsDatabase<typeof schema>

export type NotifyInput = {
    recipientIds: readonly string[]
    boardId: string
    cardId: string | null
    actorId: string
    type: NotificationType
    title: string
    boardName: string
}

/**
 * Fan a single event out to its recipients: one in-app notification row per
 * recipient plus one `send_notification_email` job each (delivered by
 * db/jobs-worker.ts, so email latency/failures never block the caller).
 */
export async function notifyUsers(db: Db, input: NotifyInput): Promise<void> {
    if (input.recipientIds.length === 0) return

    const recipients = await db
        .select({
            id: schema.users.id,
            email: schema.users.email,
        })
        .from(schema.users)
        .where(inArray(schema.users.id, [...input.recipientIds]))

    if (recipients.length === 0) return

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
    const cardUrl = input.cardId
        ? `${appUrl}/boards/${input.boardId}/cards/${input.cardId}`
        : `${appUrl}/boards/${input.boardId}`
    const email = notificationEmailContent({
        title: input.title,
        boardName: input.boardName,
        cardUrl,
    })

    await db.insert(schema.notifications).values(
        recipients.map((r) => ({
            userId: r.id,
            boardId: input.boardId,
            cardId: input.cardId,
            actorId: input.actorId,
            type: input.type,
            title: input.title,
        }))
    )

    await db.insert(schema.jobs).values(
        recipients.map((r) => ({
            type: 'send_notification_email',
            payload: { to: r.email, ...email },
        }))
    )
}
