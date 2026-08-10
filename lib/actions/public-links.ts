'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { requireOwner, logActivity, actionErrorMessage } from './helpers'

export type PublicLinkActionState = { error?: string; ok?: boolean } | undefined

/** Owner-only: turns the public link on, or rotates it if already on. */
export async function generatePublicLinkAction(
    boardId: string
): Promise<PublicLinkActionState> {
    try {
        const { user } = await requireOwner(boardId)
        const token = randomBytes(16).toString('hex')
        await db
            .update(schema.boards)
            .set({ publicToken: token })
            .where(eq(schema.boards.id, boardId))
        await logActivity({
            boardId,
            actorId: user.id,
            type: 'board.public_link_enabled',
        })
        revalidatePath(`/boards/${boardId}/settings`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function revokePublicLinkAction(
    boardId: string
): Promise<PublicLinkActionState> {
    try {
        const { user } = await requireOwner(boardId)
        await db
            .update(schema.boards)
            .set({ publicToken: null })
            .where(eq(schema.boards.id, boardId))
        await logActivity({
            boardId,
            actorId: user.id,
            type: 'board.public_link_disabled',
        })
        revalidatePath(`/boards/${boardId}/settings`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}
