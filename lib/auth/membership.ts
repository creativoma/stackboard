import 'server-only'
import { db, schema } from '@/db'
import { and, eq } from 'drizzle-orm'

/** Always re-read membership from the DB inside a mutation — never trust a client-supplied role. */
export async function getMembership(boardId: string, userId: string) {
    const rows = await db
        .select()
        .from(schema.boardMemberships)
        .where(
            and(
                eq(schema.boardMemberships.boardId, boardId),
                eq(schema.boardMemberships.userId, userId)
            )
        )
        .limit(1)
    return rows[0] ?? null
}
