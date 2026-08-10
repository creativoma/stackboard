'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, count, eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import {
    requireContentEditor,
    logActivity,
    actionErrorMessage,
    ActionError,
} from './helpers'
import { nextPosition } from '@/lib/domain/positions'
import { canAcceptCard } from '@/lib/domain/wip'

export type SubtaskActionState = { error?: string; ok?: boolean } | undefined

const titleSchema = z.string().trim().min(1, 'Title is required').max(200)

/** A subtask lands in the parent's own column, same WIP-limit rules as any new card. */
export async function addSubtaskAction(
    boardId: string,
    parentCardId: string,
    _prev: SubtaskActionState,
    formData: FormData
): Promise<SubtaskActionState> {
    try {
        const { user } = await requireContentEditor(boardId)
        const parsed = titleSchema.safeParse(formData.get('title'))
        if (!parsed.success)
            return {
                error: parsed.error.issues[0]?.message ?? 'Title is required',
            }

        const [parent] = await db
            .select()
            .from(schema.cards)
            .where(
                and(
                    eq(schema.cards.id, parentCardId),
                    eq(schema.cards.boardId, boardId)
                )
            )
            .limit(1)
        if (!parent) throw new ActionError('Parent card not found')

        const [column] = await db
            .select()
            .from(schema.columns)
            .where(eq(schema.columns.id, parent.columnId))
            .limit(1)
        if (!column || column.status !== 'active')
            throw new ActionError(
                "Cannot add a subtask while the parent's column is archived"
            )

        const [{ value: activeCount }] = await db
            .select({ value: count() })
            .from(schema.cards)
            .where(
                and(
                    eq(schema.cards.columnId, parent.columnId),
                    eq(schema.cards.status, 'active')
                )
            )

        if (!canAcceptCard(activeCount, column.wipLimit))
            throw new ActionError(
                `"${column.name}" is at its WIP limit of ${column.wipLimit}`
            )

        const [subtask] = await db
            .insert(schema.cards)
            .values({
                boardId,
                columnId: parent.columnId,
                title: parsed.data,
                position: nextPosition(activeCount),
                parentCardId,
            })
            .returning()

        await logActivity({
            boardId,
            cardId: subtask.id,
            actorId: user.id,
            type: 'card.created',
        })

        revalidatePath(`/boards/${boardId}`)
        revalidatePath(`/boards/${boardId}/cards/${parentCardId}`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

/** Unlinks a card from its parent without deleting or archiving it. */
export async function removeSubtaskLinkAction(
    boardId: string,
    cardId: string
): Promise<SubtaskActionState> {
    try {
        await requireContentEditor(boardId)
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
        const parentCardId = card.parentCardId
        if (!parentCardId) return { ok: true }

        await db
            .update(schema.cards)
            .set({ parentCardId: null })
            .where(eq(schema.cards.id, cardId))

        revalidatePath(`/boards/${boardId}/cards/${cardId}`)
        revalidatePath(`/boards/${boardId}/cards/${parentCardId}`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}
