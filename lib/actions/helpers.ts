import 'server-only'
import { requireUser, type SessionUser } from '@/lib/auth/session'
import { getMembership } from '@/lib/auth/membership'
import {
    canMutateBoardContent,
    isActiveMember,
    isBoardOwner,
} from '@/lib/domain/authorization'
import { db, schema } from '@/db'

export class ActionError extends Error {}

/** Re-reads membership from the DB on every call — never trust client-supplied role/state. */
export async function requireMembership(boardId: string): Promise<{
    user: SessionUser
    membership: NonNullable<Awaited<ReturnType<typeof getMembership>>>
}> {
    const user = await requireUser()
    const membership = await getMembership(boardId, user.id)
    if (!isActiveMember(membership)) {
        throw new ActionError('You are not an active member of this board')
    }
    return { user, membership }
}

/**
 * Gate for content mutations (cards, columns, checklists, comments, labels):
 * an active member who is not an observer. Observers keep read access via
 * requireMembership but are rejected here.
 */
export async function requireContentEditor(boardId: string) {
    const result = await requireMembership(boardId)
    if (!canMutateBoardContent(result.membership)) {
        throw new ActionError('Observers cannot make changes to this board')
    }
    return result
}

export async function requireOwner(boardId: string) {
    const result = await requireMembership(boardId)
    if (!isBoardOwner(result.membership)) {
        throw new ActionError('Only the board owner can do that')
    }
    return result
}

export async function logActivity(event: {
    boardId: string
    cardId?: string | null
    actorId: string
    type: string
    field?: string | null
    oldValue?: string | null
    newValue?: string | null
}) {
    await db.insert(schema.activityEvents).values(event)
}

export function actionErrorMessage(err: unknown): string {
    if (err instanceof ActionError) return err.message
    if (err instanceof Error && err.message === 'UNAUTHENTICATED')
        return 'Please log in again'
    return 'Something went wrong. Please try again.'
}
