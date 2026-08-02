'use server'

import { revalidatePath } from 'next/cache'
import { randomBytes, createHash } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import {
    requireOwner,
    requireMembership,
    logActivity,
    actionErrorMessage,
    ActionError,
} from './helpers'
import { requireUser } from '@/lib/auth/session'
import {
    invitationExpiresAt,
    isInvitationUsable,
    isValidEmail,
    normalizeEmail,
} from '@/lib/domain/invitations'
import { inviteEmailContent } from '@/lib/email/adapter'
import { enqueueJob } from '@/lib/jobs/queue'

export type InviteActionState = { error?: string; ok?: boolean } | undefined

function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
}

export async function inviteMemberAction(
    boardId: string,
    _prev: InviteActionState,
    formData: FormData
): Promise<InviteActionState> {
    try {
        const { user } = await requireOwner(boardId)
        const email = normalizeEmail(String(formData.get('email') ?? ''))
        if (!isValidEmail(email))
            return { error: 'Enter a valid email address' }

        const [board] = await db
            .select()
            .from(schema.boards)
            .where(eq(schema.boards.id, boardId))
            .limit(1)
        if (!board) throw new ActionError('Board not found')

        const [existingUser] = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, email))
            .limit(1)
        if (existingUser) {
            const [existingMembership] = await db
                .select()
                .from(schema.boardMemberships)
                .where(
                    and(
                        eq(schema.boardMemberships.boardId, boardId),
                        eq(schema.boardMemberships.userId, existingUser.id)
                    )
                )
                .limit(1)
            if (existingMembership?.status === 'active') {
                return { error: 'This person is already a member' }
            }
        }

        const existingPending = await db
            .select()
            .from(schema.invitations)
            .where(
                and(
                    eq(schema.invitations.boardId, boardId),
                    eq(schema.invitations.email, email),
                    eq(schema.invitations.status, 'pending')
                )
            )
            .limit(1)
        if (existingPending[0]) {
            return { error: 'An invitation is already pending for this email' }
        }

        const token = randomBytes(32).toString('hex')
        await db.insert(schema.invitations).values({
            boardId,
            email,
            invitedByUserId: user.id,
            token: hashToken(token),
            expiresAt: invitationExpiresAt(),
        })

        const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
        const acceptUrl = `${appUrl}/invite/${token}`
        const content = inviteEmailContent({
            boardName: board.name,
            inviterName: user.name,
            acceptUrl,
        })

        await enqueueJob('send_invite_email', { to: email, ...content })

        await logActivity({
            boardId,
            actorId: user.id,
            type: 'board.member_invited',
            newValue: email,
        })

        revalidatePath(`/boards/${boardId}/settings`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function revokeInvitationAction(
    boardId: string,
    invitationId: string
): Promise<InviteActionState> {
    try {
        await requireOwner(boardId)
        await db
            .update(schema.invitations)
            .set({ status: 'revoked' })
            .where(
                and(
                    eq(schema.invitations.id, invitationId),
                    eq(schema.invitations.boardId, boardId)
                )
            )
        revalidatePath(`/boards/${boardId}/settings`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function removeMemberAction(
    boardId: string,
    userId: string
): Promise<InviteActionState> {
    try {
        const { user } = await requireOwner(boardId)
        if (userId === user.id)
            return { error: 'You cannot remove yourself as owner' }

        await db
            .update(schema.boardMemberships)
            .set({ status: 'removed', removedAt: new Date() })
            .where(
                and(
                    eq(schema.boardMemberships.boardId, boardId),
                    eq(schema.boardMemberships.userId, userId)
                )
            )

        revalidatePath(`/boards/${boardId}/settings`)
        revalidatePath(`/boards/${boardId}`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export type AcceptInviteResult = { error?: string; boardId?: string }

/** Called from the /invite/[token] route after the visitor is authenticated. */
export async function acceptInvitationAction(
    token: string
): Promise<AcceptInviteResult> {
    try {
        const user = await requireUser()
        const hashed = hashToken(token)
        const [invitation] = await db
            .select()
            .from(schema.invitations)
            .where(eq(schema.invitations.token, hashed))
            .limit(1)
        if (!invitation) return { error: 'This invitation link is invalid' }
        if (!isInvitationUsable(invitation))
            return { error: 'This invitation has expired or was already used' }
        if (normalizeEmail(user.email) !== invitation.email) {
            return {
                error: `This invitation was sent to ${invitation.email}. Log in with that email to accept it.`,
            }
        }

        await db.transaction(async (tx) => {
            const [existing] = await tx
                .select()
                .from(schema.boardMemberships)
                .where(
                    and(
                        eq(schema.boardMemberships.boardId, invitation.boardId),
                        eq(schema.boardMemberships.userId, user.id)
                    )
                )
                .limit(1)

            if (existing) {
                await tx
                    .update(schema.boardMemberships)
                    .set({ status: 'active', removedAt: null })
                    .where(eq(schema.boardMemberships.id, existing.id))
            } else {
                await tx.insert(schema.boardMemberships).values({
                    boardId: invitation.boardId,
                    userId: user.id,
                    role: 'member',
                })
            }

            await tx
                .update(schema.invitations)
                .set({ status: 'accepted', acceptedAt: new Date() })
                .where(eq(schema.invitations.id, invitation.id))
            await tx.insert(schema.activityEvents).values({
                boardId: invitation.boardId,
                actorId: user.id,
                type: 'board.member_joined',
                newValue: user.name,
            })
        })

        revalidatePath(`/boards/${invitation.boardId}`)
        return { boardId: invitation.boardId }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}
