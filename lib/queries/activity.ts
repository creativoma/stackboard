import 'server-only'
import { desc, eq, inArray } from 'drizzle-orm'
import { db, schema } from '@/db'

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ActivityValues = {
    field?: string | null
    oldValue?: string | null
    newValue?: string | null
}

/**
 * Older activity rows stored raw user ids (assignee changes) and full ISO
 * timestamps (due dates) in old/new values. New rows store display values
 * at write time (see updateCardAction); this humanizes the legacy rows at
 * read time so the timeline never shows ids.
 */
export async function humanizeActivityValues<T extends ActivityValues>(
    rows: T[]
): Promise<T[]> {
    const ids = new Set<string>()
    for (const row of rows) {
        if (row.field !== 'assignee') continue
        if (row.oldValue && UUID_RE.test(row.oldValue)) ids.add(row.oldValue)
        if (row.newValue && UUID_RE.test(row.newValue)) ids.add(row.newValue)
    }

    const users = ids.size
        ? await db
              .select({ id: schema.users.id, name: schema.users.name })
              .from(schema.users)
              .where(inArray(schema.users.id, [...ids]))
        : []
    const nameById = new Map(users.map((u) => [u.id, u.name]))

    const humanize = (field: string, value: string | null | undefined) => {
        if (!value) return value
        if (field === 'assignee' && UUID_RE.test(value))
            return nameById.get(value) ?? 'a former member'
        if (field === 'due date' && value.includes('T'))
            return value.slice(0, 10)
        return value
    }

    return rows.map((row) =>
        row.field === 'assignee' || row.field === 'due date'
            ? {
                  ...row,
                  oldValue: humanize(row.field, row.oldValue),
                  newValue: humanize(row.field, row.newValue),
              }
            : row
    )
}

const BOARD_ACTIVITY_LIMIT = 200

/**
 * Board-wide activity feed: every event on the board, not just one card's.
 * `activity_board_idx` (board_id, created_at) backs this directly.
 */
export async function listBoardActivity(boardId: string) {
    const rows = await db
        .select({
            event: schema.activityEvents,
            actor: schema.users,
            cardTitle: schema.cards.title,
        })
        .from(schema.activityEvents)
        .innerJoin(
            schema.users,
            eq(schema.users.id, schema.activityEvents.actorId)
        )
        .leftJoin(
            schema.cards,
            eq(schema.cards.id, schema.activityEvents.cardId)
        )
        .where(eq(schema.activityEvents.boardId, boardId))
        .orderBy(desc(schema.activityEvents.createdAt))
        .limit(BOARD_ACTIVITY_LIMIT)

    const humanizedEvents = await humanizeActivityValues(
        rows.map((r) => r.event)
    )

    return rows.map((r, i) => ({ ...r, event: humanizedEvents[i] }))
}
