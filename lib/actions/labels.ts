'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { LABEL_COLORS } from '@/lib/labels'
import {
    requireContentEditor,
    logActivity,
    actionErrorMessage,
    ActionError,
} from './helpers'

export type LabelActionState = { error?: string; ok?: boolean } | undefined

const nameSchema = z.string().trim().min(1, 'Name is required').max(40)
const colorSchema = z.enum(
    LABEL_COLORS.map((c) => c.value) as [string, ...string[]],
    { message: 'Invalid color' }
)

export async function createLabelAction(
    boardId: string,
    _prev: LabelActionState,
    formData: FormData
): Promise<LabelActionState> {
    try {
        const { user } = await requireContentEditor(boardId)

        const name = nameSchema.safeParse(formData.get('name'))
        if (!name.success)
            return { error: name.error.issues[0]?.message ?? 'Invalid name' }
        const color = colorSchema.safeParse(formData.get('color'))
        if (!color.success)
            return { error: color.error.issues[0]?.message ?? 'Invalid color' }

        const [label] = await db
            .insert(schema.labels)
            .values({ boardId, name: name.data, color: color.data })
            .onConflictDoNothing()
            .returning()
        if (!label)
            throw new ActionError(`A label named "${name.data}" already exists`)

        await logActivity({
            boardId,
            actorId: user.id,
            type: 'label.created',
            newValue: label.name,
        })
        revalidatePath(`/boards/${boardId}`)
        revalidatePath(`/boards/${boardId}/settings`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function updateLabelColorAction(
    boardId: string,
    labelId: string,
    color: string
): Promise<LabelActionState> {
    try {
        const { user } = await requireContentEditor(boardId)

        const parsed = colorSchema.safeParse(color)
        if (!parsed.success) return { error: 'Invalid color' }

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

        if (label.color !== parsed.data) {
            await db
                .update(schema.labels)
                .set({ color: parsed.data })
                .where(eq(schema.labels.id, labelId))
            await logActivity({
                boardId,
                actorId: user.id,
                type: 'label.updated',
                field: label.name,
                oldValue: label.color,
                newValue: parsed.data,
            })
        }

        revalidatePath(`/boards/${boardId}`)
        revalidatePath(`/boards/${boardId}/settings`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function deleteLabelAction(
    boardId: string,
    labelId: string
): Promise<LabelActionState> {
    try {
        const { user } = await requireContentEditor(boardId)

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

        await db.delete(schema.labels).where(eq(schema.labels.id, labelId))
        await logActivity({
            boardId,
            actorId: user.id,
            type: 'label.deleted',
            oldValue: label.name,
        })

        revalidatePath(`/boards/${boardId}`)
        revalidatePath(`/boards/${boardId}/settings`)
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
