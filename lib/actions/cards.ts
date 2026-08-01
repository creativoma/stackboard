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
import { getMembership } from '@/lib/auth/membership'
import { isActiveMember } from '@/lib/domain/authorization'
import {
    nextPosition,
    moveBetweenLists,
    reorderWithinList,
    toPositionRows,
} from '@/lib/domain/positions'

export type CardActionState =
    { error?: string; ok?: boolean; cardId?: string } | undefined

const titleSchema = z.string().trim().min(1, 'Title is required').max(200)

async function getActiveColumn(boardId: string, columnId: string) {
    const [column] = await db
        .select()
        .from(schema.columns)
        .where(
            and(
                eq(schema.columns.id, columnId),
                eq(schema.columns.boardId, boardId)
            )
        )
        .limit(1)
    return column
}

export async function createCardAction(
    boardId: string,
    columnId: string,
    _prev: CardActionState,
    formData: FormData
): Promise<CardActionState> {
    try {
        const { user } = await requireMembership(boardId)
        const parsed = titleSchema.safeParse(formData.get('title'))
        if (!parsed.success)
            return {
                error: parsed.error.issues[0]?.message ?? 'Title is required',
            }

        const column = await getActiveColumn(boardId, columnId)
        if (!column || column.status !== 'active')
            throw new ActionError('Cannot add a card to an archived column')

        const [{ value: activeCount }] = await db
            .select({ value: count() })
            .from(schema.cards)
            .where(
                and(
                    eq(schema.cards.columnId, columnId),
                    eq(schema.cards.status, 'active')
                )
            )

        const [card] = await db
            .insert(schema.cards)
            .values({
                boardId,
                columnId,
                title: parsed.data,
                position: nextPosition(activeCount),
            })
            .returning()

        await logActivity({
            boardId,
            cardId: card.id,
            actorId: user.id,
            type: 'card.created',
        })
        revalidatePath(`/boards/${boardId}`)
        return { ok: true, cardId: card.id }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

const updateCardSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(10000).optional(),
    assigneeId: z.union([z.string().uuid(), z.literal('')]).optional(),
    dueDate: z.union([z.string(), z.literal('')]).optional(),
})

export async function updateCardAction(
    boardId: string,
    cardId: string,
    _prev: CardActionState,
    formData: FormData
): Promise<CardActionState> {
    try {
        const { user } = await requireMembership(boardId)

        const parsed = updateCardSchema.safeParse({
            title: formData.has('title')
                ? String(formData.get('title'))
                : undefined,
            description: formData.has('description')
                ? String(formData.get('description'))
                : undefined,
            assigneeId: formData.has('assigneeId')
                ? String(formData.get('assigneeId'))
                : undefined,
            dueDate: formData.has('dueDate')
                ? String(formData.get('dueDate'))
                : undefined,
        })
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

        // If assigning, verify the target user is an active member of the board.
        if (parsed.data.assigneeId) {
            const targetMembership = await getMembership(
                boardId,
                parsed.data.assigneeId
            )
            if (!isActiveMember(targetMembership))
                throw new ActionError('Assignee must be an active board member')
        }

        const patch: Partial<typeof schema.cards.$inferInsert> = {
            updatedAt: new Date(),
        }
        const events: {
            field: string
            oldValue: string | null
            newValue: string | null
        }[] = []

        if (
            parsed.data.title !== undefined &&
            parsed.data.title !== card.title
        ) {
            patch.title = parsed.data.title
            events.push({
                field: 'title',
                oldValue: card.title,
                newValue: parsed.data.title,
            })
        }
        if (
            parsed.data.description !== undefined &&
            parsed.data.description !== card.description
        ) {
            patch.description = parsed.data.description
            events.push({
                field: 'description',
                oldValue: null,
                newValue: null,
            })
        }
        if (parsed.data.assigneeId !== undefined) {
            const newAssignee = parsed.data.assigneeId || null
            if (newAssignee !== card.assigneeId) {
                patch.assigneeId = newAssignee
                events.push({
                    field: 'assignee',
                    oldValue: card.assigneeId,
                    newValue: newAssignee,
                })
            }
        }
        if (parsed.data.dueDate !== undefined) {
            const newDue = parsed.data.dueDate
                ? new Date(parsed.data.dueDate)
                : null
            const oldDueIso = card.dueDate ? card.dueDate.toISOString() : null
            const newDueIso = newDue ? newDue.toISOString() : null
            if (newDueIso !== oldDueIso) {
                patch.dueDate = newDue
                events.push({
                    field: 'due date',
                    oldValue: oldDueIso,
                    newValue: newDueIso,
                })
            }
        }

        if (Object.keys(patch).length > 1) {
            await db
                .update(schema.cards)
                .set(patch)
                .where(eq(schema.cards.id, cardId))
            for (const event of events) {
                await logActivity({
                    boardId,
                    cardId,
                    actorId: user.id,
                    type: 'card.field_changed',
                    ...event,
                })
            }
        }

        revalidatePath(`/boards/${boardId}`)
        revalidatePath(`/boards/${boardId}/cards/${cardId}`)
        revalidatePath(`/boards/${boardId}/settings`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function moveCardAction(
    boardId: string,
    cardId: string,
    destColumnId: string,
    destIndex: number
): Promise<CardActionState> {
    try {
        const { user } = await requireMembership(boardId)

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
        if (!card || card.status !== 'active')
            throw new ActionError('Card not found')

        const destColumn = await getActiveColumn(boardId, destColumnId)
        if (!destColumn || destColumn.status !== 'active')
            throw new ActionError('Cannot move a card into an archived column')

        const sourceCards = await db
            .select({ id: schema.cards.id })
            .from(schema.cards)
            .where(
                and(
                    eq(schema.cards.columnId, card.columnId),
                    eq(schema.cards.status, 'active')
                )
            )
            .orderBy(schema.cards.position)
        const sourceIds = sourceCards.map((c) => c.id)

        if (card.columnId === destColumnId) {
            const reordered = reorderWithinList(sourceIds, cardId, destIndex)
            const rows = toPositionRows(reordered)
            await db.transaction(async (tx) => {
                for (const row of rows) {
                    await tx
                        .update(schema.cards)
                        .set({ position: row.position })
                        .where(eq(schema.cards.id, row.id))
                }
            })
        } else {
            const destCards = await db
                .select({ id: schema.cards.id })
                .from(schema.cards)
                .where(
                    and(
                        eq(schema.cards.columnId, destColumnId),
                        eq(schema.cards.status, 'active')
                    )
                )
                .orderBy(schema.cards.position)
            const destIds = destCards.map((c) => c.id)

            const { source, dest } = moveBetweenLists(
                sourceIds,
                destIds,
                cardId,
                destIndex
            )
            const sourceRows = toPositionRows(source)
            const destRows = toPositionRows(dest)

            const [sourceColumn] = await db
                .select()
                .from(schema.columns)
                .where(eq(schema.columns.id, card.columnId))
                .limit(1)

            await db.transaction(async (tx) => {
                await tx
                    .update(schema.cards)
                    .set({ columnId: destColumnId })
                    .where(eq(schema.cards.id, cardId))
                for (const row of sourceRows) {
                    await tx
                        .update(schema.cards)
                        .set({ position: row.position })
                        .where(eq(schema.cards.id, row.id))
                }
                for (const row of destRows) {
                    await tx
                        .update(schema.cards)
                        .set({ position: row.position })
                        .where(eq(schema.cards.id, row.id))
                }
            })

            await logActivity({
                boardId,
                cardId,
                actorId: user.id,
                type: 'card.moved',
                oldValue: sourceColumn?.name ?? '',
                newValue: destColumn.name,
            })
        }

        revalidatePath(`/boards/${boardId}`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function archiveCardAction(
    boardId: string,
    cardId: string
): Promise<CardActionState> {
    try {
        const { user } = await requireMembership(boardId)
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
        if (!card || card.status !== 'active')
            throw new ActionError('Card not found')

        await db
            .update(schema.cards)
            .set({ status: 'archived', archivedAt: new Date() })
            .where(eq(schema.cards.id, cardId))
        await logActivity({
            boardId,
            cardId,
            actorId: user.id,
            type: 'card.archived',
        })

        revalidatePath(`/boards/${boardId}`)
        revalidatePath(`/boards/${boardId}/cards/${cardId}`)
        revalidatePath(`/boards/${boardId}/settings`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function restoreCardAction(
    boardId: string,
    cardId: string,
    destColumnId: string
): Promise<CardActionState> {
    try {
        const { user } = await requireMembership(boardId)
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
        if (!card || card.status !== 'archived')
            throw new ActionError('Card is not archived')

        const destColumn = await getActiveColumn(boardId, destColumnId)
        if (!destColumn || destColumn.status !== 'active') {
            throw new ActionError(
                'Choose an active column to restore this card into'
            )
        }

        const [{ value: activeCount }] = await db
            .select({ value: count() })
            .from(schema.cards)
            .where(
                and(
                    eq(schema.cards.columnId, destColumnId),
                    eq(schema.cards.status, 'active')
                )
            )

        await db
            .update(schema.cards)
            .set({
                status: 'active',
                archivedAt: null,
                columnId: destColumnId,
                position: nextPosition(activeCount),
            })
            .where(eq(schema.cards.id, cardId))

        await logActivity({
            boardId,
            cardId,
            actorId: user.id,
            type: 'card.restored',
            newValue: destColumn.name,
        })

        revalidatePath(`/boards/${boardId}`)
        revalidatePath(`/boards/${boardId}/cards/${cardId}`)
        revalidatePath(`/boards/${boardId}/settings`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}
