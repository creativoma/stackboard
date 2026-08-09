import { and, asc, eq, inArray, isNull, lte } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '@/db/schema'
import { jobHandlers } from './handlers'
import {
    notificationTitle,
    recipientsForEvent,
} from '@/lib/domain/notifications'
import { notifyUsers } from '@/lib/notifications/create'

// No `server-only` import (unlike lib/jobs/queue.ts) — this is loaded by
// db/jobs-worker.ts, a plain tsx script outside Next's server bundling
// context. It takes a `db` instance rather than importing the guarded
// singleton in @/db, so it can be driven by either that singleton (from
// Next server code, if ever needed) or a standalone client (the worker
// script).
type Db = PostgresJsDatabase<typeof schema>

const BATCH_SIZE = 10
const MAX_ATTEMPTS = 5

function backoffMs(attempts: number): number {
    return Math.min(60_000, 1_000 * 2 ** attempts)
}

/** Claims and runs up to BATCH_SIZE due jobs. Returns how many it processed. */
export async function processDueJobs(db: Db): Promise<number> {
    const claimed = await db.transaction(async (tx) => {
        const due = await tx
            .select()
            .from(schema.jobs)
            .where(
                and(
                    eq(schema.jobs.status, 'pending'),
                    lte(schema.jobs.runAfter, new Date())
                )
            )
            .orderBy(asc(schema.jobs.runAfter))
            .limit(BATCH_SIZE)
            .for('update', { skipLocked: true })

        if (due.length === 0) return []

        await tx
            .update(schema.jobs)
            .set({ status: 'processing', updatedAt: new Date() })
            .where(
                inArray(
                    schema.jobs.id,
                    due.map((job) => job.id)
                )
            )

        return due
    })

    for (const job of claimed) {
        try {
            const handler = jobHandlers[job.type]
            if (!handler) {
                throw new Error(
                    `No handler registered for job type "${job.type}"`
                )
            }
            await handler(job.payload)
            await db
                .update(schema.jobs)
                .set({ status: 'done', updatedAt: new Date() })
                .where(eq(schema.jobs.id, job.id))
        } catch (err) {
            const attempts = job.attempts + 1
            const exhausted = attempts >= MAX_ATTEMPTS
            await db
                .update(schema.jobs)
                .set({
                    status: exhausted ? 'failed' : 'pending',
                    attempts,
                    lastError: err instanceof Error ? err.message : String(err),
                    runAfter: new Date(Date.now() + backoffMs(attempts)),
                    updatedAt: new Date(),
                })
                .where(eq(schema.jobs.id, job.id))
        }
    }

    return claimed.length
}

const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * Notifies assignee + watchers of active cards due within the next 24 hours
 * (or already overdue and never reminded). Marking `dueReminderSentAt`
 * first, guarded by IS NULL, atomically claims each card — concurrent
 * workers can never send a duplicate reminder. Returns cards reminded.
 */
export async function scanDueSoonCards(db: Db): Promise<number> {
    const cutoff = new Date(Date.now() + DUE_SOON_WINDOW_MS)

    const candidates = await db
        .select({ id: schema.cards.id })
        .from(schema.cards)
        .innerJoin(schema.boards, eq(schema.boards.id, schema.cards.boardId))
        .where(
            and(
                eq(schema.cards.status, 'active'),
                eq(schema.boards.status, 'active'),
                isNull(schema.cards.dueReminderSentAt),
                lte(schema.cards.dueDate, cutoff)
            )
        )
    if (candidates.length === 0) return 0

    const claimed = await db
        .update(schema.cards)
        .set({ dueReminderSentAt: new Date() })
        .where(
            and(
                inArray(
                    schema.cards.id,
                    candidates.map((c) => c.id)
                ),
                isNull(schema.cards.dueReminderSentAt)
            )
        )
        .returning({
            id: schema.cards.id,
            boardId: schema.cards.boardId,
            title: schema.cards.title,
            assigneeId: schema.cards.assigneeId,
        })

    for (const card of claimed) {
        const [board] = await db
            .select({
                name: schema.boards.name,
                ownerId: schema.boards.ownerId,
            })
            .from(schema.boards)
            .where(eq(schema.boards.id, card.boardId))
            .limit(1)
        if (!board) continue

        const watchers = await db
            .select({ userId: schema.cardWatchers.userId })
            .from(schema.cardWatchers)
            .where(eq(schema.cardWatchers.cardId, card.id))
        const activeMembers = await db
            .select({ userId: schema.boardMemberships.userId })
            .from(schema.boardMemberships)
            .where(
                and(
                    eq(schema.boardMemberships.boardId, card.boardId),
                    eq(schema.boardMemberships.status, 'active')
                )
            )

        // System event: no human actor. The assignee (or board owner) stands
        // in for the notNull actor column, with includeActor so they still
        // receive their own reminder.
        const actorId = card.assigneeId ?? board.ownerId
        const recipients = recipientsForEvent({
            type: 'card.due_soon',
            actorId,
            assigneeId: card.assigneeId,
            watcherIds: watchers.map((w) => w.userId),
            mentionedIds: [],
            activeMemberIds: activeMembers.map((m) => m.userId),
            includeActor: true,
        })
        await notifyUsers(db, {
            recipientIds: recipients,
            boardId: card.boardId,
            cardId: card.id,
            actorId,
            type: 'card.due_soon',
            title: notificationTitle('card.due_soon', '', card.title),
            boardName: board.name,
        })
    }

    return claimed.length
}
