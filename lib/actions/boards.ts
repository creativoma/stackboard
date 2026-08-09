'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { boardColorValues } from '@/db/schema'
import { requireUser } from '@/lib/auth/session'
import { requireOwner, logActivity, actionErrorMessage } from './helpers'
import { createBoardFromNormalized } from '@/lib/import/create-board'
import { getBoardTemplate } from '@/lib/templates/boards'

const createBoardSchema = z.object({
    name: z.string().trim().min(1, 'Board name is required').max(100),
    columnNames: z
        .array(z.string().trim().min(1).max(60))
        .min(1, 'Add at least one column')
        .max(8, 'Up to 8 columns'),
})

export type CreateBoardState = { error?: string } | undefined

export async function createBoardAction(
    _prev: CreateBoardState,
    formData: FormData
): Promise<CreateBoardState> {
    const user = await requireUser()

    const columnNames = formData
        .getAll('columnName')
        .map((v) => String(v).trim())
        .filter(Boolean)

    const parsed = createBoardSchema.safeParse({
        name: formData.get('name'),
        columnNames,
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
    }

    let boardId = ''
    await db.transaction(async (tx) => {
        const [board] = await tx
            .insert(schema.boards)
            .values({ name: parsed.data.name, ownerId: user.id })
            .returning()
        boardId = board.id

        await tx
            .insert(schema.boardMemberships)
            .values({ boardId: board.id, userId: user.id, role: 'owner' })

        await tx.insert(schema.columns).values(
            parsed.data.columnNames.map((name, position) => ({
                boardId: board.id,
                name,
                position,
            }))
        )

        await tx.insert(schema.activityEvents).values({
            boardId: board.id,
            actorId: user.id,
            type: 'board.created',
            newValue: board.name,
        })
    })

    revalidatePath('/boards')
    redirect(`/boards/${boardId}`)
}

export type CreateFromTemplateState = { error?: string } | undefined

/** Creates a board from a built-in template (lib/templates/boards.ts). */
export async function createBoardFromTemplateAction(
    _prev: CreateFromTemplateState,
    formData: FormData
): Promise<CreateFromTemplateState> {
    const user = await requireUser()

    const template = getBoardTemplate(String(formData.get('template') ?? ''))
    if (!template) return { error: 'Choose a template' }

    const requestedName = String(formData.get('name') ?? '').trim()
    if (requestedName.length > 100)
        return { error: 'Board name is too long (max 100 characters)' }

    const boardId = await createBoardFromNormalized(user.id, {
        ...template.board,
        boardName: requestedName || template.board.boardName,
    })

    revalidatePath('/boards')
    redirect(`/boards/${boardId}`)
}

const renameBoardSchema = z.object({ name: z.string().trim().min(1).max(100) })

export type SettingsActionState = { error?: string; ok?: boolean } | undefined

export async function renameBoardAction(
    boardId: string,
    _prev: SettingsActionState,
    formData: FormData
): Promise<SettingsActionState> {
    try {
        const { user } = await requireOwner(boardId)
        const parsed = renameBoardSchema.safeParse({
            name: formData.get('name'),
        })
        if (!parsed.success)
            return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

        const [board] = await db
            .select()
            .from(schema.boards)
            .where(eq(schema.boards.id, boardId))
            .limit(1)
        if (!board) return { error: 'Board not found' }

        await db
            .update(schema.boards)
            .set({ name: parsed.data.name, updatedAt: new Date() })
            .where(eq(schema.boards.id, boardId))
        await logActivity({
            boardId,
            actorId: user.id,
            type: 'card.field_changed',
            field: 'board name',
            oldValue: board.name,
            newValue: parsed.data.name,
        })

        revalidatePath(`/boards/${boardId}`)
        revalidatePath(`/boards/${boardId}/settings`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

const setBoardColorSchema = z.object({
    color: z.enum(boardColorValues),
})

export async function setBoardColorAction(
    boardId: string,
    color: string
): Promise<SettingsActionState> {
    try {
        await requireOwner(boardId)
        const parsed = setBoardColorSchema.safeParse({ color })
        if (!parsed.success) return { error: 'Invalid color' }

        await db
            .update(schema.boards)
            .set({ color: parsed.data.color, updatedAt: new Date() })
            .where(eq(schema.boards.id, boardId))

        revalidatePath('/boards')
        revalidatePath(`/boards/${boardId}/settings`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function closeBoardAction(
    boardId: string
): Promise<SettingsActionState> {
    try {
        const { user } = await requireOwner(boardId)
        await db
            .update(schema.boards)
            .set({ status: 'closed', closedAt: new Date() })
            .where(eq(schema.boards.id, boardId))
        await logActivity({ boardId, actorId: user.id, type: 'board.closed' })
        revalidatePath('/boards')
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
    redirect('/boards')
}
