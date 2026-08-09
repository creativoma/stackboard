'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import {
    requireContentEditor,
    actionErrorMessage,
    ActionError,
} from './helpers'

export type LabelActionState = { error?: string; ok?: boolean } | undefined

export async function toggleCardLabelAction(
    boardId: string,
    cardId: string,
    labelId: string,
    on: boolean
): Promise<LabelActionState> {
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
        const [label] = await db
            .select()
            .from(schema.labels)
            .where(
                and(
                    eq(schema.labels.id, labelId),
                    eq(schema.labels.boardId, boardId)
                )
            )
            .limit(1)
        if (!label) throw new ActionError('Label not found')

        if (on) {
            await db
                .insert(schema.cardLabels)
                .values({ cardId, labelId })
                .onConflictDoNothing()
        } else {
            await db
                .delete(schema.cardLabels)
                .where(
                    and(
                        eq(schema.cardLabels.cardId, cardId),
                        eq(schema.cardLabels.labelId, labelId)
                    )
                )
        }

        revalidatePath(`/boards/${boardId}`)
        revalidatePath(`/boards/${boardId}/cards/${cardId}`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}
