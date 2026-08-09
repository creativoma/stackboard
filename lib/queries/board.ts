import 'server-only'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db, schema } from '@/db'

export async function getBoard(boardId: string) {
    const [board] = await db
        .select()
        .from(schema.boards)
        .where(eq(schema.boards.id, boardId))
        .limit(1)
    return board ?? null
}

export async function getBoardMembers(boardId: string) {
    // Columns are listed explicitly: selecting `schema.users` wholesale pulls
    // passwordHash into the row, and these rows are handed to client
    // components, which would serialize it into the RSC payload.
    return db
        .select({
            user: {
                id: schema.users.id,
                name: schema.users.name,
                email: schema.users.email,
            },
            role: schema.boardMemberships.role,
            joinedAt: schema.boardMemberships.createdAt,
        })
        .from(schema.boardMemberships)
        .innerJoin(
            schema.users,
            eq(schema.users.id, schema.boardMemberships.userId)
        )
        .where(
            and(
                eq(schema.boardMemberships.boardId, boardId),
                eq(schema.boardMemberships.status, 'active')
            )
        )
        .orderBy(asc(schema.users.name))
}

export async function getBoardLabels(boardId: string) {
    return db
        .select()
        .from(schema.labels)
        .where(eq(schema.labels.boardId, boardId))
        .orderBy(asc(schema.labels.name))
}

export async function getActiveColumns(boardId: string) {
    return db
        .select()
        .from(schema.columns)
        .where(
            and(
                eq(schema.columns.boardId, boardId),
                eq(schema.columns.status, 'active')
            )
        )
        .orderBy(asc(schema.columns.position))
}

export async function getActiveColumnsWithCards(boardId: string) {
    const columns = await db
        .select()
        .from(schema.columns)
        .where(
            and(
                eq(schema.columns.boardId, boardId),
                eq(schema.columns.status, 'active')
            )
        )
        .orderBy(asc(schema.columns.position))

    const cards = await db
        .select()
        .from(schema.cards)
        .where(
            and(
                eq(schema.cards.boardId, boardId),
                eq(schema.cards.status, 'active')
            )
        )
        .orderBy(asc(schema.cards.position))

    const cardIds = cards.map((c) => c.id)
    const cardLabelRows = cardIds.length
        ? await db
              .select()
              .from(schema.cardLabels)
              .where(inArray(schema.cardLabels.cardId, cardIds))
        : []
    const checklistRows = cardIds.length
        ? await db
              .select()
              .from(schema.checklistItems)
              .where(inArray(schema.checklistItems.cardId, cardIds))
        : []

    const labelsByCard = new Map<string, string[]>()
    for (const row of cardLabelRows) {
        const list = labelsByCard.get(row.cardId) ?? []
        list.push(row.labelId)
        labelsByCard.set(row.cardId, list)
    }

    const checklistByCard = new Map<string, { total: number; done: number }>()
    for (const row of checklistRows) {
        const entry = checklistByCard.get(row.cardId) ?? { total: 0, done: 0 }
        entry.total += 1
        if (row.done) entry.done += 1
        checklistByCard.set(row.cardId, entry)
    }

    const cardsWithMeta = cards.map((card) => ({
        ...card,
        labelIds: labelsByCard.get(card.id) ?? [],
        checklist: checklistByCard.get(card.id) ?? { total: 0, done: 0 },
    }))

    return { columns, cards: cardsWithMeta }
}

export async function getArchivedColumns(boardId: string) {
    return db
        .select()
        .from(schema.columns)
        .where(
            and(
                eq(schema.columns.boardId, boardId),
                eq(schema.columns.status, 'archived')
            )
        )
        .orderBy(asc(schema.columns.archivedAt))
}

export async function getArchivedCards(boardId: string) {
    return db
        .select()
        .from(schema.cards)
        .where(
            and(
                eq(schema.cards.boardId, boardId),
                eq(schema.cards.status, 'archived')
            )
        )
        .orderBy(asc(schema.cards.archivedAt))
}
