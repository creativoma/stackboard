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

export type BoardSearchResult = {
    boardId: string
    name: string
}

/** Board name search, scoped to boards the user actively belongs to. */
export async function searchBoards(
    userId: string,
    rawQuery: string
): Promise<BoardSearchResult[]> {
    const q = normalizeSearchQuery(rawQuery)
    if (!q) return []

    return db
        .select({ boardId: schema.boards.id, name: schema.boards.name })
        .from(schema.boards)
        .innerJoin(
            schema.boardMemberships,
            eq(schema.boardMemberships.boardId, schema.boards.id)
        )
        .where(
            and(
                eq(schema.boardMemberships.userId, userId),
                eq(schema.boardMemberships.status, 'active'),
                eq(schema.boards.status, 'active'),
                ilike(schema.boards.name, `%${q}%`)
            )
        )
        .orderBy(desc(schema.boards.updatedAt))
        .limit(MAX_RESULTS)
}

export type CommentSearchResult = {
    commentId: string
    cardId: string
    boardId: string
    boardName: string
    cardTitle: string
    body: string
    authorName: string
    createdAt: Date
}

/** Comment body search, scoped to boards the user actively belongs to. */
export async function searchComments(
    userId: string,
    rawQuery: string
): Promise<CommentSearchResult[]> {
    const q = normalizeSearchQuery(rawQuery)
    if (!q) return []

    return db
        .select({
            commentId: schema.comments.id,
            cardId: schema.comments.cardId,
            boardId: schema.cards.boardId,
            boardName: schema.boards.name,
            cardTitle: schema.cards.title,
            body: schema.comments.body,
            authorName: schema.users.name,
            createdAt: schema.comments.createdAt,
        })
        .from(schema.comments)
        .innerJoin(schema.cards, eq(schema.cards.id, schema.comments.cardId))
        .innerJoin(schema.boards, eq(schema.boards.id, schema.cards.boardId))
        .innerJoin(schema.users, eq(schema.users.id, schema.comments.authorId))
        .innerJoin(
            schema.boardMemberships,
            eq(schema.boardMemberships.boardId, schema.cards.boardId)
        )
        .where(
            and(
                eq(schema.boardMemberships.userId, userId),
                eq(schema.boardMemberships.status, 'active'),
                eq(schema.boards.status, 'active'),
                ilike(schema.comments.body, `%${q}%`)
            )
        )
        .orderBy(desc(schema.comments.createdAt))
        .limit(MAX_RESULTS)
}
