'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, eq, count } from 'drizzle-orm'
import { db, schema } from '@/db'
import {
    requireMembership,
    logActivity,
    actionErrorMessage,
    ActionError,
} from './helpers'
import { nextPosition } from '@/lib/domain/positions'

export type ChecklistActionState = { error?: string; ok?: boolean } | undefined

const textSchema = z.string().trim().min(1, 'Item text is required').max(300)

async function getCard(boardId: string, cardId: string) {
    const [card] = await db
        .select()
        .from(schema.cards)
        .where(
            and(eq(schema.cards.id, cardId), eq(schema.cards.boardId, boardId))
        )
        .limit(1)
    return card
}

export async function addChecklistItemAction(
    boardId: string,
    cardId: string,
    _prev: ChecklistActionState,
    formData: FormData
): Promise<ChecklistActionState> {
    try {
        const { user } = await requireMembership(boardId)
        const parsed = textSchema.safeParse(formData.get('text'))
        if (!parsed.success)
            return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

        const card = await getCard(boardId, cardId)
        if (!card) throw new ActionError('Card not found')

        const [{ value: existing }] = await db
            .select({ value: count() })
            .from(schema.checklistItems)
            .where(eq(schema.checklistItems.cardId, cardId))

        await db.insert(schema.checklistItems).values({
            cardId,
            text: parsed.data,
            position: nextPosition(existing),
        })
        await logActivity({
            boardId,
            cardId,
            actorId: user.id,
            type: 'checklist.item_added',
            newValue: parsed.data,
        })

        revalidatePath(`/boards/${boardId}/cards/${cardId}`)
        revalidatePath(`/boards/${boardId}`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function toggleChecklistItemAction(
    boardId: string,
    cardId: string,
    itemId: string,
    done: boolean
): Promise<ChecklistActionState> {
    try {
        const { user } = await requireMembership(boardId)
        const card = await getCard(boardId, cardId)
        if (!card) throw new ActionError('Card not found')

        const [item] = await db
            .select()
            .from(schema.checklistItems)
            .where(
                and(
                    eq(schema.checklistItems.id, itemId),
                    eq(schema.checklistItems.cardId, cardId)
                )
            )
            .limit(1)
        if (!item) throw new ActionError('Checklist item not found')

        await db
            .update(schema.checklistItems)
            .set({ done })
            .where(eq(schema.checklistItems.id, itemId))
        await logActivity({
            boardId,
            cardId,
            actorId: user.id,
            type: 'checklist.item_toggled',
            field: item.text,
            newValue: String(done),
        })

        revalidatePath(`/boards/${boardId}/cards/${cardId}`)
        revalidatePath(`/boards/${boardId}`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}
