'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { requireMembership, actionErrorMessage, ActionError } from './helpers'

export type LabelActionState = { error?: string; ok?: boolean } | undefined

// Trello's fixed six-color functional label palette (see DESIGN.md).
const LABEL_COLORS = [
    'green',
    'yellow',
    'orange',
    'red',
    'purple',
    'blue',
] as const

const createLabelSchema = z.object({
    name: z.string().trim().min(1).max(40),
    color: z.enum(LABEL_COLORS),
})

export async function createLabelAction(
    boardId: string,
    _prev: LabelActionState,
    formData: FormData
): Promise<LabelActionState> {
    try {
        await requireMembership(boardId)
        const parsed = createLabelSchema.safeParse({
            name: formData.get('name'),
            color: formData.get('color'),
        })
        if (!parsed.success)
            return { error: parsed.error.issues[0]?.message ?? 'Invalid label' }

        await db.insert(schema.labels).values({
            boardId,
            name: parsed.data.name,
            color: parsed.data.color,
        })
        revalidatePath(`/boards/${boardId}`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function toggleCardLabelAction(
    boardId: string,
    cardId: string,
    labelId: string,
    on: boolean
): Promise<LabelActionState> {
    try {
        await requireMembership(boardId)

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
