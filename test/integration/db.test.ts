import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, and } from 'drizzle-orm'
import * as schema from '@/db/schema'
import { getMembership as getMembershipFactory } from '@/lib/auth/membership'
import {
    canMutateBoardContent,
    isActiveMember,
} from '@/lib/domain/authorization'
import { moveBetweenLists, toPositionRows } from '@/lib/domain/positions'
import { canAcceptCard } from '@/lib/domain/wip'
import { searchCards } from '@/lib/queries/search'
import { listMyCards } from '@/lib/queries/my-cards'
import { processDueJobs, scanDueSoonCards } from '@/lib/jobs/worker'
import { notifyUsers } from '@/lib/notifications/create'
import { createBoardFromNormalized } from '@/lib/import/create-board'
import { getBoardTemplate } from '@/lib/templates/boards'
import { LocalDiskStorage } from '@/lib/storage/local'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// This suite must run with DATABASE_URL pointed at an isolated test database
// (see the `test:integration` script), never the dev/seed database — every
// test wipes all tables. `lib/auth/membership` reuses the app's shared `db`
// client, which reads DATABASE_URL at import time, so the env var has to be
// set by the process that launches vitest, not by code inside this file.
const TEST_DATABASE_URL = process.env.DATABASE_URL ?? ''
if (!TEST_DATABASE_URL.includes('stackboard_test')) {
    throw new Error(
        'Refusing to run destructive integration tests: DATABASE_URL must point at the stackboard_test database. Use `bun run test:integration`.'
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
    await db.delete(schema.jobs)
    await db.delete(schema.notifications)
    await db.delete(schema.attachments)
    await db.delete(schema.cardWatchers)
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

describe('observer role: read access without mutation rights', () => {
    it('keeps an observer active (can read) while the content-mutation gate rejects them', async () => {
        const { board } = await seedBoardWithMembers()
        const [observer] = await db
            .insert(schema.users)
            .values({
                name: 'Observer',
                email: 'observer@test.dev',
                passwordHash: 'x',
            })
            .returning()
        await db.insert(schema.boardMemberships).values({
            boardId: board.id,
            userId: observer.id,
            role: 'observer',
        })

        const membership = await getMembershipFactory(board.id, observer.id)
        expect(isActiveMember(membership)).toBe(true)
        expect(canMutateBoardContent(membership)).toBe(false)
    })

    it('grants the invited role when an observer invitation is accepted', async () => {
        const { board, owner } = await seedBoardWithMembers()
        const [invitation] = await db
            .insert(schema.invitations)
            .values({
                boardId: board.id,
                email: 'newcomer@test.dev',
                invitedByUserId: owner.id,
                role: 'observer',
                token: 'hashed-token',
                expiresAt: new Date(Date.now() + 86_400_000),
            })
            .returning()
        expect(invitation.role).toBe('observer')
    })
})

describe('WIP limits', () => {
    it('stores a column wip limit and the entry rule rejects a card once the column is full', async () => {
        const { board, colA } = await seedBoardWithMembers()
        await db
            .update(schema.columns)
            .set({ wipLimit: 1 })
            .where(eq(schema.columns.id, colA.id))
        await db.insert(schema.cards).values({
            boardId: board.id,
            columnId: colA.id,
            title: 'Only card',
            position: 0,
        })

        const [column] = await db
            .select()
            .from(schema.columns)
            .where(eq(schema.columns.id, colA.id))
        const [{ count: activeCount }] = await db
            .select({ count: schema.cards.id })
            .from(schema.cards)
            .where(
                and(
                    eq(schema.cards.columnId, colA.id),
                    eq(schema.cards.status, 'active')
                )
            )
            .then((rows) => [{ count: rows.length }])

        expect(column.wipLimit).toBe(1)
        expect(canAcceptCard(activeCount, column.wipLimit)).toBe(false)
        expect(canAcceptCard(activeCount, null)).toBe(true)
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

describe('card search', () => {
    it('matches title and description full-text for members and never leaks across boards', async () => {
        const { board, colA, owner, member } = await seedBoardWithMembers()
        const [outsider] = await db
            .insert(schema.users)
            .values({
                name: 'Outsider',
                email: 'outsider@test.dev',
                passwordHash: 'x',
            })
            .returning()
        await db.insert(schema.cards).values([
            {
                boardId: board.id,
                columnId: colA.id,
                title: 'Launch checklist',
                description: 'Prepare the rocket for departure',
                position: 0,
            },
            {
                boardId: board.id,
                columnId: colA.id,
                title: 'Unrelated chore',
                description: '',
                position: 1,
            },
        ])

        const byTitle = await searchCards(member.id, 'launch')
        expect(byTitle).toHaveLength(1)
        expect(byTitle[0].title).toBe('Launch checklist')
        expect(byTitle[0].boardName).toBe('Test Board')

        const byDescription = await searchCards(owner.id, 'rocket departure')
        expect(byDescription).toHaveLength(1)

        const leaked = await searchCards(outsider.id, 'launch')
        expect(leaked).toHaveLength(0)
    })

    it('returns nothing for queries too short to normalize', async () => {
        const { member } = await seedBoardWithMembers()
        expect(await searchCards(member.id, ' a ')).toHaveLength(0)
    })
})

describe('my cards', () => {
    it('lists only active cards assigned to the user on boards with an active membership', async () => {
        const { board, colA, member, owner } = await seedBoardWithMembers()
        await db.insert(schema.cards).values([
            {
                boardId: board.id,
                columnId: colA.id,
                title: 'Mine',
                assigneeId: member.id,
                position: 0,
            },
            {
                boardId: board.id,
                columnId: colA.id,
                title: 'Someone elses',
                assigneeId: owner.id,
                position: 1,
            },
            {
                boardId: board.id,
                columnId: colA.id,
                title: 'Mine but archived',
                assigneeId: member.id,
                status: 'archived',
                position: 2,
            },
        ])

        const mine = await listMyCards(member.id)
        expect(mine.map((c) => c.title)).toEqual(['Mine'])
        expect(mine[0].boardName).toBe('Test Board')

        // Removing the membership hides the card even while still assigned.
        await db
            .update(schema.boardMemberships)
            .set({ status: 'removed' })
            .where(eq(schema.boardMemberships.userId, member.id))
        expect(await listMyCards(member.id)).toHaveLength(0)
    })
})

describe('notifications', () => {
    it('notifyUsers writes one in-app row and one email job per recipient', async () => {
        const { board, colA, owner, member } = await seedBoardWithMembers()
        const [card] = await db
            .insert(schema.cards)
            .values({
                boardId: board.id,
                columnId: colA.id,
                title: 'Notify me',
                position: 0,
            })
            .returning()

        await notifyUsers(db, {
            recipientIds: [owner.id, member.id],
            boardId: board.id,
            cardId: card.id,
            actorId: owner.id,
            type: 'comment.added',
            title: 'Owner commented on "Notify me"',
            boardName: board.name,
        })

        const rows = await db.select().from(schema.notifications)
        expect(rows).toHaveLength(2)
        expect(rows.every((r) => r.readAt === null)).toBe(true)

        const emailJobs = await db
            .select()
            .from(schema.jobs)
            .where(eq(schema.jobs.type, 'send_notification_email'))
        expect(emailJobs).toHaveLength(2)
    })

    it('due-soon scan claims each card exactly once and notifies assignee + watchers', async () => {
        const { board, colA, owner, member } = await seedBoardWithMembers()
        const inTwoHours = new Date(Date.now() + 2 * 60 * 60 * 1000)
        const [card] = await db
            .insert(schema.cards)
            .values({
                boardId: board.id,
                columnId: colA.id,
                title: 'Due soon',
                assigneeId: member.id,
                dueDate: inTwoHours,
                position: 0,
            })
            .returning()
        await db
            .insert(schema.cardWatchers)
            .values({ cardId: card.id, userId: owner.id })

        expect(await scanDueSoonCards(db)).toBe(1)

        const rows = await db
            .select()
            .from(schema.notifications)
            .where(eq(schema.notifications.type, 'card.due_soon'))
        expect(rows.map((r) => r.userId).sort()).toEqual(
            [member.id, owner.id].sort()
        )

        // Second scan finds nothing: the card was claimed via dueReminderSentAt.
        expect(await scanDueSoonCards(db)).toBe(0)
    })
})

describe('board templates', () => {
    it('creates a complete board from a template through the shared import path', async () => {
        const [creator] = await db
            .insert(schema.users)
            .values({
                name: 'Creator',
                email: 'creator@test.dev',
                passwordHash: 'x',
            })
            .returning()

        const template = getBoardTemplate('kanban')
        expect(template).toBeDefined()
        const boardId = await createBoardFromNormalized(
            creator.id,
            template!.board
        )

        const [board] = await db
            .select()
            .from(schema.boards)
            .where(eq(schema.boards.id, boardId))
        expect(board.ownerId).toBe(creator.id)

        const columns = await db
            .select()
            .from(schema.columns)
            .where(eq(schema.columns.boardId, boardId))
        expect(columns.map((c) => c.name).sort()).toEqual(
            ['Doing', 'Done', 'To do'].sort()
        )

        const cards = await db
            .select()
            .from(schema.cards)
            .where(eq(schema.cards.boardId, boardId))
        expect(cards).toHaveLength(1)

        const checklist = await db
            .select()
            .from(schema.checklistItems)
            .where(eq(schema.checklistItems.cardId, cards[0].id))
        expect(checklist).toHaveLength(2)
    })
})

describe('local disk object storage', () => {
    it('round-trips bytes, reports missing objects as null, and deletes', async () => {
        const root = await mkdtemp(join(tmpdir(), 'stackboard-storage-'))
        try {
            const storage = new LocalDiskStorage(root)
            const bytes = new TextEncoder().encode('hello attachment')

            await storage.put('board-1/att-1', bytes)
            const stream = await storage.getStream('board-1/att-1')
            expect(stream).not.toBeNull()
            const read = new Uint8Array(
                await new Response(stream!).arrayBuffer()
            )
            expect(new TextDecoder().decode(read)).toBe('hello attachment')

            expect(await storage.getStream('board-1/nope')).toBeNull()

            await storage.delete('board-1/att-1')
            expect(await storage.getStream('board-1/att-1')).toBeNull()
        } finally {
            await rm(root, { recursive: true, force: true })
        }
    })

    it('refuses keys that escape the storage root', async () => {
        const root = await mkdtemp(join(tmpdir(), 'stackboard-storage-'))
        try {
            const storage = new LocalDiskStorage(root)
            await expect(
                storage.put('../outside.txt', new Uint8Array([1]))
            ).rejects.toThrow(/Invalid storage key/)
        } finally {
            await rm(root, { recursive: true, force: true })
        }
    })
})

describe('background jobs worker', () => {
    it('claims and completes a due job with a registered handler', async () => {
        const [job] = await db
            .insert(schema.jobs)
            .values({
                type: 'send_invite_email',
                payload: {
                    to: 'someone@test.dev',
                    subject: 'Hi',
                    text: 'Hi',
                    html: '<p>Hi</p>',
                },
            })
            .returning()

        const processed = await processDueJobs(db)
        expect(processed).toBe(1)

        const [updated] = await db
            .select()
            .from(schema.jobs)
            .where(eq(schema.jobs.id, job.id))
        expect(updated.status).toBe('done')
    })

    it('leaves a job scheduled in the future untouched', async () => {
        await db.insert(schema.jobs).values({
            type: 'send_invite_email',
            payload: { to: 'x@test.dev', subject: '', text: '', html: '' },
            runAfter: new Date(Date.now() + 60_000),
        })

        const processed = await processDueJobs(db)
        expect(processed).toBe(0)
    })

    it('retries a job with no registered handler, recording the error and backing off', async () => {
        const [job] = await db
            .insert(schema.jobs)
            .values({ type: 'no_such_handler', payload: {} })
            .returning()

        await processDueJobs(db)

        const [updated] = await db
            .select()
            .from(schema.jobs)
            .where(eq(schema.jobs.id, job.id))
        expect(updated.status).toBe('pending')
        expect(updated.attempts).toBe(1)
        expect(updated.lastError).toMatch(/No handler registered/)
        expect(updated.runAfter.getTime()).toBeGreaterThan(Date.now())
    })

    it('marks a job failed once it exhausts its retry attempts', async () => {
        // MAX_ATTEMPTS in lib/jobs/worker.ts is 5 — seed the job one attempt
        // away from exhausted so this test doesn't wait through 4 backoffs.
        const [job] = await db
            .insert(schema.jobs)
            .values({ type: 'no_such_handler', payload: {}, attempts: 4 })
            .returning()

        await processDueJobs(db)

        const [updated] = await db
            .select()
            .from(schema.jobs)
            .where(eq(schema.jobs.id, job.id))
        expect(updated.status).toBe('failed')
        expect(updated.attempts).toBe(5)
    })
})
