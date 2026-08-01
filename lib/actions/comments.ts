'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import {
    requireMembership,
    logActivity,
    actionErrorMessage,
    ActionError,
} from './helpers'

export type CommentActionState = { error?: string; ok?: boolean } | undefined

const bodySchema = z.string().trim().min(1, 'Comment cannot be empty').max(4000)

export async function addCommentAction(
    boardId: string,
    cardId: string,
    _prev: CommentActionState,
    formData: FormData
): Promise<CommentActionState> {
    try {
        const { user } = await requireMembership(boardId)
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

        revalidatePath(`/boards/${boardId}/cards/${cardId}`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}
