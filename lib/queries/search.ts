import 'server-only'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { db, schema } from '@/db'
import { normalizeSearchQuery } from '@/lib/domain/search'

export type CardSearchResult = {
    cardId: string
    boardId: string
    title: string
    description: string
    cardStatus: 'active' | 'archived'
    boardName: string
    columnName: string
}

const MAX_RESULTS = 50

/**
 * Full-text card search across every board the user is an active member of.
 * Backed by the `cards_search_idx` GIN expression index; short/odd queries
 * fall back to ILIKE so a two-letter fragment still finds titles.
 */
export async function searchCards(
    userId: string,
    rawQuery: string
): Promise<CardSearchResult[]> {
    const q = normalizeSearchQuery(rawQuery)
    if (!q) return []

    const fullText = sql`to_tsvector('simple', ${schema.cards.title} || ' ' || ${schema.cards.description}) @@ websearch_to_tsquery('simple', ${q})`
    const fuzzy = or(
        ilike(schema.cards.title, `%${q}%`),
        ilike(schema.cards.description, `%${q}%`)
    )

    return db
        .select({
            cardId: schema.cards.id,
            boardId: schema.cards.boardId,
            title: schema.cards.title,
            description: schema.cards.description,
            cardStatus: schema.cards.status,
            boardName: schema.boards.name,
            columnName: schema.columns.name,
        })
        .from(schema.cards)
        .innerJoin(schema.boards, eq(schema.boards.id, schema.cards.boardId))
        .innerJoin(schema.columns, eq(schema.columns.id, schema.cards.columnId))
        .innerJoin(
            schema.boardMemberships,
            eq(schema.boardMemberships.boardId, schema.cards.boardId)
        )
        .where(
            and(
                eq(schema.boardMemberships.userId, userId),
                eq(schema.boardMemberships.status, 'active'),
                eq(schema.boards.status, 'active'),
                or(fullText, fuzzy)
            )
        )
        .orderBy(desc(schema.cards.updatedAt))
        .limit(MAX_RESULTS)
}
