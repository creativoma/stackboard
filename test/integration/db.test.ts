import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, and } from 'drizzle-orm'
import * as schema from '@/db/schema'
import { getMembership as getMembershipFactory } from '@/lib/auth/membership'
import { isActiveMember } from '@/lib/domain/authorization'
import { moveBetweenLists, toPositionRows } from '@/lib/domain/positions'

// This suite must run with DATABASE_URL pointed at an isolated test database
// (see the `test:integration` script), never the dev/seed database — every
// test wipes all tables. `lib/auth/membership` reuses the app's shared `db`
// client, which reads DATABASE_URL at import time, so the env var has to be
// set by the process that launches vitest, not by code inside this file.
const TEST_DATABASE_URL = process.env.DATABASE_URL ?? ''
if (!TEST_DATABASE_URL.includes('deck_test')) {
    throw new Error(
        'Refusing to run destructive integration tests: DATABASE_URL must point at the deck_test database. Use `bun run test:integration`.'
    )
}

const client = postgres(TEST_DATABASE_URL, { max: 1 })
const db = drizzle(client, { schema })

async function resetSchema() {
    // drizzle-kit tracks applied migrations in its own "drizzle" schema, so
    // that has to be wiped too — otherwise it thinks migrations already ran
    // against the now-empty "public" schema and skips recreating the tables.
    await client`drop schema if exists public cascade`
    await client`drop schema if exists drizzle cascade`
    await client`create schema public`
}

async function applyMigrations() {
    const { execSync } = await import('node:child_process')
    execSync('bunx drizzle-kit migrate', {
        env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
        stdio: 'inherit',
        cwd: process.cwd(),
    })
}

beforeAll(async () => {
    await resetSchema()
    await applyMigrations()
}, 60000)

afterAll(async () => {
    await client.end()
})

beforeEach(async () => {
    await db.delete(schema.activityEvents)
    await db.delete(schema.comments)
    await db.delete(schema.checklistItems)
    await db.delete(schema.cardLabels)
    await db.delete(schema.cards)
    await db.delete(schema.labels)
    await db.delete(schema.columns)
    await db.delete(schema.invitations)
    await db.delete(schema.boardMemberships)
    await db.delete(schema.boards)
    await db.delete(schema.sessions)
    await db.delete(schema.users)
})

async function seedBoardWithMembers() {
    const [owner, member] = await db
        .insert(schema.users)
        .values([
            { name: 'Owner', email: 'owner@test.dev', passwordHash: 'x' },
            { name: 'Member', email: 'member@test.dev', passwordHash: 'x' },
        ])
        .returning()

    const [board] = await db
        .insert(schema.boards)
        .values({ name: 'Test Board', ownerId: owner.id })
        .returning()

    await db.insert(schema.boardMemberships).values([
        { boardId: board.id, userId: owner.id, role: 'owner' },
        { boardId: board.id, userId: member.id, role: 'member' },
    ])

    const [colA, colB] = await db
        .insert(schema.columns)
        .values([
            { boardId: board.id, name: 'A', position: 0 },
            { boardId: board.id, name: 'B', position: 1 },
        ])
        .returning()

    return { owner, member, board, colA, colB }
}

describe('board membership uniqueness', () => {
    it('rejects a duplicate (board, user) membership row', async () => {
        const { board, member } = await seedBoardWithMembers()
        await expect(
            db.insert(schema.boardMemberships).values({
                boardId: board.id,
                userId: member.id,
                role: 'member',
            })
        ).rejects.toThrow()
    })
})

describe('acceptance scenario: removed membership blocks mutation', () => {
    it('denies access once membership status flips to removed, without deleting the row', async () => {
        const { board, member } = await seedBoardWithMembers()

        let membership = await getMembershipFactory(board.id, member.id)
        expect(isActiveMember(membership)).toBe(true)

        await db
            .update(schema.boardMemberships)
            .set({ status: 'removed', removedAt: new Date() })
            .where(
                and(
                    eq(schema.boardMemberships.boardId, board.id),
                    eq(schema.boardMemberships.userId, member.id)
                )
            )

        membership = await getMembershipFactory(board.id, member.id)
        expect(isActiveMember(membership)).toBe(false)
    })
})

describe('card move persists an atomic, collision-free reorder', () => {
    it('moving a card between columns leaves both lists contiguous with no duplicate ids', async () => {
        const { board, colA, colB } = await seedBoardWithMembers()

        const cards = await db
            .insert(schema.cards)
            .values([
                {
                    boardId: board.id,
                    columnId: colA.id,
                    title: 'Card 1',
                    position: 0,
                },
                {
                    boardId: board.id,
                    columnId: colA.id,
                    title: 'Card 2',
                    position: 1,
                },
                {
                    boardId: board.id,
                    columnId: colB.id,
                    title: 'Card 3',
                    position: 0,
                },
            ])
            .returning()

        const [card1, card2] = cards

        const { source, dest } = moveBetweenLists(
            [card1.id, card2.id],
            [cards[2].id],
            card1.id,
            0
        )
        const sourceRows = toPositionRows(source)
        const destRows = toPositionRows(dest)

        await db.transaction(async (tx) => {
            await tx
                .update(schema.cards)
                .set({ columnId: colB.id })
                .where(eq(schema.cards.id, card1.id))
            for (const row of sourceRows) {
                await tx
                    .update(schema.cards)
                    .set({ position: row.position })
                    .where(eq(schema.cards.id, row.id))
            }
            for (const row of destRows) {
                await tx
                    .update(schema.cards)
                    .set({ position: row.position })
                    .where(eq(schema.cards.id, row.id))
            }
        })

        const columnACards = await db
            .select()
            .from(schema.cards)
            .where(eq(schema.cards.columnId, colA.id))
        const columnBCards = await db
            .select()
            .from(schema.cards)
            .where(eq(schema.cards.columnId, colB.id))

        expect(columnACards.map((c) => c.id)).toEqual([card2.id])
        expect(columnACards[0].position).toBe(0)

        const columnBIds = columnBCards.map((c) => c.id).sort()
        expect(columnBIds).toEqual([card1.id, cards[2].id].sort())
        expect(new Set(columnBCards.map((c) => c.position)).size).toBe(
            columnBCards.length
        )
    })
})
