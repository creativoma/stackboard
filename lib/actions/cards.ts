'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, eq, count, inArray } from 'drizzle-orm'
import { db, schema } from '@/db'
import { cardPriorityValues } from '@/db/schema'
import { priorityMeta } from '@/lib/priority'
import {
    requireContentEditor,
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
import { canAcceptCard } from '@/lib/domain/wip'
import {
    dueDateToIso,
    parseDueDate,
    MIN_DUE_YEAR,
    MAX_DUE_YEAR,
} from '@/lib/domain/due'
import {
    notificationTitle,
    recipientsForEvent,
} from '@/lib/domain/notifications'
import { notifyUsers } from '@/lib/notifications/create'
import { getCardTemplate } from '@/lib/templates/cards'

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
        const { user } = await requireContentEditor(boardId)
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

        if (!canAcceptCard(activeCount, column.wipLimit))
            throw new ActionError(
                `"${column.name}" is at its WIP limit of ${column.wipLimit}`
            )

        const templateKeyRaw = formData.get('templateKey')
        const template =
            typeof templateKeyRaw === 'string' && templateKeyRaw
                ? getCardTemplate(templateKeyRaw)
                : undefined

        const [card] = await db
            .insert(schema.cards)
            .values({
                boardId,
                columnId,
                title: parsed.data,
                position: nextPosition(activeCount),
                priority: template?.priority ?? null,
            })
            .returning()

        if (template && template.checklist.length > 0) {
            await db.insert(schema.checklistItems).values(
                template.checklist.map((text, i) => ({
                    cardId: card.id,
                    text,
                    position: i,
                }))
            )
        }

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
    startDate: z.union([z.string(), z.literal('')]).optional(),
    dueDate: z.union([z.string(), z.literal('')]).optional(),
    priority: z.union([z.enum(cardPriorityValues), z.literal('')]).optional(),
})

export async function updateCardAction(
    boardId: string,
    cardId: string,
    _prev: CardActionState,
    formData: FormData
): Promise<CardActionState> {
    try {
        const { user } = await requireContentEditor(boardId)

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
            startDate: formData.has('startDate')
                ? String(formData.get('startDate'))
                : undefined,
            dueDate: formData.has('dueDate')
                ? String(formData.get('dueDate'))
                : undefined,
            priority: formData.has('priority')
                ? String(formData.get('priority'))
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
                // The activity log is read by humans — store member names,
                // not user ids (legacy id rows are humanized at read time).
                const changedIds = [card.assigneeId, newAssignee].filter(
                    (v): v is string => v !== null
                )
                const changedUsers = changedIds.length
                    ? await db
                          .select({
                              id: schema.users.id,
                              name: schema.users.name,
                          })
                          .from(schema.users)
                          .where(inArray(schema.users.id, changedIds))
                    : []
                const nameOf = (id: string | null) =>
                    id
                        ? (changedUsers.find((u) => u.id === id)?.name ?? null)
                        : null
                events.push({
                    field: 'assignee',
                    oldValue: nameOf(card.assigneeId),
                    newValue: nameOf(newAssignee),
                })
            }
        }
        if (parsed.data.priority !== undefined) {
            const newPriority = parsed.data.priority || null
            if (newPriority !== card.priority) {
                patch.priority = newPriority
                events.push({
                    field: 'priority',
                    oldValue: priorityMeta(card.priority)?.label ?? null,
                    newValue: priorityMeta(newPriority)?.label ?? null,
                })
            }
        }
        if (parsed.data.startDate !== undefined) {
            const newStart = parseDueDate(parsed.data.startDate)
            if (newStart === undefined)
                throw new ActionError(
                    `Start date must be a real date between ${MIN_DUE_YEAR} and ${MAX_DUE_YEAR}`
                )
            const oldStartIso = dueDateToIso(card.startDate)
            const newStartIso = newStart ? newStart.toISOString() : null
            if (newStartIso !== oldStartIso) {
                patch.startDate = newStart
                events.push({
                    field: 'start date',
                    oldValue: oldStartIso ? oldStartIso.slice(0, 10) : null,
                    newValue: newStartIso ? newStartIso.slice(0, 10) : null,
                })
            }
        }
        if (parsed.data.dueDate !== undefined) {
            const newDue = parseDueDate(parsed.data.dueDate)
            if (newDue === undefined)
                throw new ActionError(
                    `Due date must be a real date between ${MIN_DUE_YEAR} and ${MAX_DUE_YEAR}`
                )
            const oldDueIso = dueDateToIso(card.dueDate)
            const newDueIso = newDue ? newDue.toISOString() : null
            if (newDueIso !== oldDueIso) {
                patch.dueDate = newDue
                // Log calendar dates, not full ISO timestamps.
                events.push({
                    field: 'due date',
                    oldValue: oldDueIso ? oldDueIso.slice(0, 10) : null,
                    newValue: newDueIso ? newDueIso.slice(0, 10) : null,
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

            // A newly assigned member starts watching the card and gets told.
            const newAssignee = patch.assigneeId
            if (newAssignee) {
                await db
                    .insert(schema.cardWatchers)
                    .values({ cardId, userId: newAssignee })
                    .onConflictDoNothing()

                const [board] = await db
                    .select({ name: schema.boards.name })
                    .from(schema.boards)
                    .where(eq(schema.boards.id, boardId))
                    .limit(1)
                const activeMembers = await db
                    .select({ userId: schema.boardMemberships.userId })
                    .from(schema.boardMemberships)
                    .where(
                        and(
                            eq(schema.boardMemberships.boardId, boardId),
                            eq(schema.boardMemberships.status, 'active')
                        )
                    )
                const recipients = recipientsForEvent({
                    type: 'card.assigned',
                    actorId: user.id,
                    assigneeId: newAssignee,
                    watcherIds: [],
                    mentionedIds: [],
                    activeMemberIds: activeMembers.map((m) => m.userId),
                })
                await notifyUsers(db, {
                    recipientIds: recipients,
                    boardId,
                    cardId,
                    actorId: user.id,
                    type: 'card.assigned',
                    title: notificationTitle(
                        'card.assigned',
                        user.name,
                        patch.title ?? card.title
                    ),
                    boardName: board?.name ?? '',
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
        const { user } = await requireContentEditor(boardId)

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

            if (!canAcceptCard(destIds.length, destColumn.wipLimit))
                throw new ActionError(
                    `"${destColumn.name}" is at its WIP limit of ${destColumn.wipLimit}`
                )

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

/**
 * Watching is a personal subscription, not a content mutation — observers
 * may watch too, so this uses requireMembership rather than
 * requireContentEditor.
 */
export async function watchCardAction(
    boardId: string,
    cardId: string,
    watch: boolean
): Promise<CardActionState> {
    try {
        const { user } = await requireMembership(boardId)
        const [card] = await db
            .select({ id: schema.cards.id })
            .from(schema.cards)
            .where(
                and(
                    eq(schema.cards.id, cardId),
                    eq(schema.cards.boardId, boardId)
                )
            )
            .limit(1)
        if (!card) throw new ActionError('Card not found')

        if (watch) {
            await db
                .insert(schema.cardWatchers)
                .values({ cardId, userId: user.id })
                .onConflictDoNothing()
        } else {
            await db
                .delete(schema.cardWatchers)
                .where(
                    and(
                        eq(schema.cardWatchers.cardId, cardId),
                        eq(schema.cardWatchers.userId, user.id)
                    )
                )
        }

        revalidatePath(`/boards/${boardId}/cards/${cardId}`)
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
        const { user } = await requireContentEditor(boardId)
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
        const { user } = await requireContentEditor(boardId)
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

        if (!canAcceptCard(activeCount, destColumn.wipLimit))
            throw new ActionError(
                `"${destColumn.name}" is at its WIP limit of ${destColumn.wipLimit}`
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
