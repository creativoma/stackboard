import 'server-only'
import { and, count, desc, eq } from 'drizzle-orm'
import { db, schema } from '@/db'

export async function listBoardsForUser(userId: string) {
    const memberships = await db
        .select({ board: schema.boards, role: schema.boardMemberships.role })
        .from(schema.boardMemberships)
        .innerJoin(
            schema.boards,
            eq(schema.boards.id, schema.boardMemberships.boardId)
        )
        .where(
            and(
                eq(schema.boardMemberships.userId, userId),
                eq(schema.boardMemberships.status, 'active')
            )
        )
        .orderBy(desc(schema.boards.updatedAt))

    const boards = await Promise.all(
        memberships.map(async ({ board, role }) => {
            const activeMembers = await db
                .select({ id: schema.users.id, name: schema.users.name })
                .from(schema.boardMemberships)
                .innerJoin(
                    schema.users,
                    eq(schema.users.id, schema.boardMemberships.userId)
                )
                .where(
                    and(
                        eq(schema.boardMemberships.boardId, board.id),
                        eq(schema.boardMemberships.status, 'active')
                    )
                )

            const [{ value: cardCount }] = await db
                .select({ value: count() })
                .from(schema.cards)
                .where(
                    and(
                        eq(schema.cards.boardId, board.id),
                        eq(schema.cards.status, 'active')
                    )
                )

            const [latestActivity] = await db
                .select({
                    type: schema.activityEvents.type,
                    field: schema.activityEvents.field,
                    oldValue: schema.activityEvents.oldValue,
                    newValue: schema.activityEvents.newValue,
                    createdAt: schema.activityEvents.createdAt,
                    actorName: schema.users.name,
                })
                .from(schema.activityEvents)
                .innerJoin(
                    schema.users,
                    eq(schema.users.id, schema.activityEvents.actorId)
                )
                .where(eq(schema.activityEvents.boardId, board.id))
                .orderBy(desc(schema.activityEvents.createdAt))
                .limit(1)

            return {
                board,
                role,
                members: activeMembers,
                memberCount: activeMembers.length,
                cardCount,
                latestActivity,
            }
        })
    )

    return {
        active: boards.filter((b) => b.board.status === 'active'),
        closed: boards.filter((b) => b.board.status === 'closed'),
    }
}

export async function listPendingInvitations(email: string) {
    return db
        .select({ invitation: schema.invitations, board: schema.boards })
        .from(schema.invitations)
        .innerJoin(
            schema.boards,
            eq(schema.boards.id, schema.invitations.boardId)
        )
        .where(
            and(
                eq(schema.invitations.email, email),
                eq(schema.invitations.status, 'pending')
            )
        )
        .orderBy(desc(schema.invitations.createdAt))
}
