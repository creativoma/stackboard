'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, eq, count } from 'drizzle-orm'
import { db, schema } from '@/db'
import {
    requireContentEditor,
    requireOwner,
    logActivity,
    actionErrorMessage,
    ActionError,
} from './helpers'
import {
    nextPosition,
    reorderWithinList,
    toPositionRows,
} from '@/lib/domain/positions'
import { parseWipLimit } from '@/lib/domain/wip'

export type ColumnActionState = { error?: string; ok?: boolean } | undefined

const nameSchema = z.string().trim().min(1, 'Name is required').max(60)

export async function createColumnAction(
    boardId: string,
    _prev: ColumnActionState,
    formData: FormData
): Promise<ColumnActionState> {
    try {
        const { user } = await requireContentEditor(boardId)
        const parsed = nameSchema.safeParse(formData.get('name'))
        if (!parsed.success)
            return { error: parsed.error.issues[0]?.message ?? 'Invalid name' }

        const [{ value: activeCount }] = await db
            .select({ value: count() })
            .from(schema.columns)
            .where(
                and(
                    eq(schema.columns.boardId, boardId),
                    eq(schema.columns.status, 'active')
                )
            )

        const [column] = await db
            .insert(schema.columns)
            .values({
                boardId,
                name: parsed.data,
                position: nextPosition(activeCount),
            })
            .returning()

        await logActivity({
            boardId,
            actorId: user.id,
            type: 'column.created',
            newValue: column.name,
        })
        revalidatePath(`/boards/${boardId}`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function archiveColumnAction(
    boardId: string,
    columnId: string
): Promise<ColumnActionState> {
    try {
        const { user } = await requireContentEditor(boardId)

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
        if (!column || column.status !== 'active')
            throw new ActionError('Column not found')

        const [{ value: activeCards }] = await db
            .select({ value: count() })
            .from(schema.cards)
            .where(
                and(
                    eq(schema.cards.columnId, columnId),
                    eq(schema.cards.status, 'active')
                )
            )

        if (activeCards > 0) {
            throw new ActionError(
                'Move or archive all cards out of this column before archiving it'
            )
        }

        await db
            .update(schema.columns)
            .set({ status: 'archived', archivedAt: new Date() })
            .where(eq(schema.columns.id, columnId))
        await logActivity({
            boardId,
            actorId: user.id,
            type: 'column.archived',
            oldValue: column.name,
        })

        revalidatePath(`/boards/${boardId}`)
        revalidatePath(`/boards/${boardId}/settings`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function restoreColumnAction(
    boardId: string,
    columnId: string
): Promise<ColumnActionState> {
    try {
        const { user } = await requireContentEditor(boardId)

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
        if (!column || column.status !== 'archived')
            throw new ActionError('Column is not archived')

        const [{ value: activeCount }] = await db
            .select({ value: count() })
            .from(schema.columns)
            .where(
                and(
                    eq(schema.columns.boardId, boardId),
                    eq(schema.columns.status, 'active')
                )
            )

        await db
            .update(schema.columns)
            .set({
                status: 'active',
                archivedAt: null,
                position: nextPosition(activeCount),
            })
            .where(eq(schema.columns.id, columnId))
        await logActivity({
            boardId,
            actorId: user.id,
            type: 'column.restored',
            newValue: column.name,
        })

        revalidatePath(`/boards/${boardId}`)
        revalidatePath(`/boards/${boardId}/settings`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function setColumnWipLimitAction(
    boardId: string,
    columnId: string,
    rawLimit: string
): Promise<ColumnActionState> {
    try {
        const { user } = await requireOwner(boardId)

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
        if (!column) throw new ActionError('Column not found')

        const wipLimit = parseWipLimit(rawLimit)
        if (wipLimit === column.wipLimit) return { ok: true }

        await db
            .update(schema.columns)
            .set({ wipLimit })
            .where(eq(schema.columns.id, columnId))
        await logActivity({
            boardId,
            actorId: user.id,
            type: 'column.wip_limit_changed',
            field: column.name,
            oldValue: column.wipLimit === null ? null : String(column.wipLimit),
            newValue: wipLimit === null ? null : String(wipLimit),
        })

        revalidatePath(`/boards/${boardId}`)
        revalidatePath(`/boards/${boardId}/settings`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function reorderColumnsAction(
    boardId: string,
    columnId: string,
    destIndex: number
): Promise<ColumnActionState> {
    try {
        await requireOwner(boardId)

        const activeColumns = await db
            .select({ id: schema.columns.id })
            .from(schema.columns)
            .where(
                and(
                    eq(schema.columns.boardId, boardId),
                    eq(schema.columns.status, 'active')
                )
            )
            .orderBy(schema.columns.position)

        const ids = activeColumns.map((c) => c.id)
        if (!ids.includes(columnId))
            throw new ActionError('Column not found or archived')

        const reordered = reorderWithinList(ids, columnId, destIndex)
        const rows = toPositionRows(reordered)

        await db.transaction(async (tx) => {
            for (const row of rows) {
                await tx
                    .update(schema.columns)
                    .set({ position: row.position })
                    .where(eq(schema.columns.id, row.id))
            }
        })

        revalidatePath(`/boards/${boardId}`)
        revalidatePath(`/boards/${boardId}/settings`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}
