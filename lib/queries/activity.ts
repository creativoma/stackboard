import 'server-only'
import { inArray } from 'drizzle-orm'
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
