import 'server-only'
import { and, desc, eq } from 'drizzle-orm'
import { db, schema } from '@/db'

export async function getPendingInvitationsForBoard(boardId: string) {
    return db
        .select()
        .from(schema.invitations)
        .where(
            and(
                eq(schema.invitations.boardId, boardId),
                eq(schema.invitations.status, 'pending')
            )
        )
        .orderBy(desc(schema.invitations.createdAt))
}
