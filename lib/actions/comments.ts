'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import {
    requireContentEditor,
    logActivity,
    actionErrorMessage,
    ActionError,
} from './helpers'
import {
    extractMentionCandidates,
    resolveMentions,
} from '@/lib/domain/mentions'
import {
    notificationTitle,
    splitCommentRecipients,
} from '@/lib/domain/notifications'
import { notifyUsers } from '@/lib/notifications/create'

export type CommentActionState = { error?: string; ok?: boolean } | undefined

const bodySchema = z.string().trim().min(1, 'Comment cannot be empty').max(4000)

export async function addCommentAction(
    boardId: string,
    cardId: string,
    _prev: CommentActionState,
    formData: FormData
): Promise<CommentActionState> {
    try {
        const { user } = await requireContentEditor(boardId)
        const parsed = bodySchema.safeParse(formData.get('body'))
        if (!parsed.success)
            return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

        const [card] = await db
            .select()
            .from(schema.cards)
            .where(
                and(
                    eq(schema.cards.id, cardId),
                    eq(schema.cards.boardId, boardId)
                )
            )
            .limit(1)
        if (!card) throw new ActionError('Card not found')

        await db
            .insert(schema.comments)
            .values({ cardId, authorId: user.id, body: parsed.data })
        await logActivity({
            boardId,
            cardId,
            actorId: user.id,
            type: 'comment.added',
        })

        // Fan out notifications: mentioned members get the specific mention
        // notification; remaining watchers + the assignee get the plain one.
        const [board] = await db
            .select({ name: schema.boards.name })
            .from(schema.boards)
            .where(eq(schema.boards.id, boardId))
            .limit(1)
        const activeMembers = await db
            .select({
                id: schema.users.id,
                name: schema.users.name,
                email: schema.users.email,
            })
            .from(schema.boardMemberships)
            .innerJoin(
                schema.users,
                eq(schema.users.id, schema.boardMemberships.userId)
            )
            .where(
                and(
                    eq(schema.boardMemberships.boardId, boardId),
                    eq(schema.boardMemberships.status, 'active')
                )
            )
        const watchers = await db
            .select({ userId: schema.cardWatchers.userId })
            .from(schema.cardWatchers)
            .where(eq(schema.cardWatchers.cardId, cardId))

        const mentionedIds = resolveMentions(
            extractMentionCandidates(parsed.data),
            activeMembers
        )
        const { mentioned, others } = splitCommentRecipients({
            actorId: user.id,
            assigneeId: card.assigneeId,
            watcherIds: watchers.map((w) => w.userId),
            mentionedIds,
            activeMemberIds: activeMembers.map((m) => m.id),
        })

        const common = {
            boardId,
            cardId,
            actorId: user.id,
            boardName: board?.name ?? '',
        }
        await notifyUsers(db, {
            ...common,
            recipientIds: mentioned,
            type: 'comment.mentioned',
            title: notificationTitle(
                'comment.mentioned',
                user.name,
                card.title
            ),
        })
        await notifyUsers(db, {
            ...common,
            recipientIds: others,
            type: 'comment.added',
            title: notificationTitle('comment.added', user.name, card.title),
        })

        revalidatePath(`/boards/${boardId}/cards/${cardId}`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}
