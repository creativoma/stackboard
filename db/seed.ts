import 'dotenv/config'
import { randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const scryptAsync = promisify(scrypt)

async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex')
    const derived = (await scryptAsync(password, salt, 64)) as Buffer
    return `${salt}:${derived.toString('hex')}`
}

async function main() {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL is not set')

    const client = postgres(connectionString, { max: 1 })
    const db = drizzle(client, { schema })

    console.log('Seeding: clearing existing data…')
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

    const password = await hashPassword('password123')

    const [alice, bob, carol, , grace] = await db
        .insert(schema.users)
        .values([
            {
                name: 'Alice Owens',
                email: 'alice@example.com',
                passwordHash: password,
            },
            {
                name: 'Bob Ramirez',
                email: 'bob@example.com',
                passwordHash: password,
            },
            {
                name: 'Carol Nguyen',
                email: 'carol@example.com',
                passwordHash: password,
            },
            {
                name: 'Dave Patel',
                email: 'dave@example.com',
                passwordHash: password,
            }, // not a board member — permission-restricted state
            {
                name: 'Grace Kim',
                email: 'grace@example.com',
                passwordHash: password,
            }, // observer — read-only member state
        ])
        .returning()

    console.log('Seeding: creating "Product Launch" board (happy path)…')
    const [board] = await db
        .insert(schema.boards)
        .values({ name: 'Product Launch', ownerId: alice.id })
        .returning()

    await db.insert(schema.boardMemberships).values([
        { boardId: board.id, userId: alice.id, role: 'owner' },
        { boardId: board.id, userId: bob.id, role: 'member' },
        { boardId: board.id, userId: carol.id, role: 'member' },
        { boardId: board.id, userId: grace.id, role: 'observer' },
    ])

    const [todo, inProgress, done, empty] = await db
        .insert(schema.columns)
        .values([
            { boardId: board.id, name: 'To do', position: 0 },
            // wipLimit exercises the WIP badge + entry enforcement
            {
                boardId: board.id,
                name: 'In progress',
                position: 1,
                wipLimit: 3,
            },
            { boardId: board.id, name: 'Done', position: 2 },
            { boardId: board.id, name: 'Blocked', position: 3 }, // empty-state column
        ])
        .returning()
    void empty

    const [urgentLabel, bugLabel, featureLabel, designLabel] = await db
        .insert(schema.labels)
        .values([
            { boardId: board.id, name: 'Urgent', color: 'red' },
            { boardId: board.id, name: 'Bug', color: 'purple' },
            { boardId: board.id, name: 'Feature', color: 'green' },
            { boardId: board.id, name: 'Design', color: 'blue' },
        ])
        .returning()

    const now = Date.now()
    const [
        overdueCard,
        activeCard,
        ,
        archivedCard,
        onboardingEmailCard,
        analyticsCard,
        billingMigrationCard,
        emptyStatesCard,
        changelogCard,
    ] = await db
        .insert(schema.cards)
        .values([
            {
                boardId: board.id,
                columnId: todo.id,
                title: 'Write launch announcement',
                description:
                    'Draft the **launch** post for the blog and socials.',
                assigneeId: bob.id,
                priority: 'high',
                dueDate: new Date(now - 3 * 24 * 60 * 60 * 1000), // overdue state
                position: 0,
            },
            {
                boardId: board.id,
                columnId: inProgress.id,
                title: 'Fix onboarding checklist bug',
                description:
                    'Checklist items sometimes fail to save on slow connections.',
                assigneeId: carol.id,
                priority: 'highest',
                dueDate: new Date(now + 5 * 24 * 60 * 60 * 1000),
                position: 0,
            },
            {
                boardId: board.id,
                columnId: done.id,
                title: 'Finalize pricing page copy',
                description: 'Approved by marketing.',
                assigneeId: alice.id,
                position: 0,
            },
            {
                boardId: board.id,
                columnId: done.id,
                title: 'Old landing page experiment',
                description: 'Superseded by the new page.',
                position: 1,
                status: 'archived',
                archivedAt: new Date(now - 10 * 24 * 60 * 60 * 1000), // archived state
            },
            {
                boardId: board.id,
                columnId: todo.id,
                title: 'Design onboarding email sequence',
                description: 'Three-part welcome series for new signups.',
                assigneeId: carol.id,
                priority: 'medium',
                dueDate: new Date(now + 2 * 24 * 60 * 60 * 1000),
                position: 1,
            },
            {
                boardId: board.id,
                columnId: todo.id,
                title: 'Set up analytics dashboard',
                description: 'Track signups, activation, and retention.',
                assigneeId: bob.id,
                priority: 'low',
                position: 2,
            },
            {
                boardId: board.id,
                columnId: inProgress.id,
                title: 'Migrate billing to new API',
                description: 'Swap the legacy billing client before launch.',
                assigneeId: alice.id,
                priority: 'high',
                dueDate: new Date(now + 24 * 60 * 60 * 1000),
                position: 1,
            },
            {
                boardId: board.id,
                columnId: inProgress.id,
                title: 'Polish empty states',
                description: 'Illustrations and copy for every empty list.',
                assigneeId: bob.id,
                priority: 'medium',
                position: 2,
            },
            {
                boardId: board.id,
                columnId: done.id,
                title: 'Ship changelog page',
                description: 'In-app changelog, linked from the user menu.',
                assigneeId: carol.id,
                position: 2,
            },
        ])
        .returning()

    await db.insert(schema.cardLabels).values([
        { cardId: overdueCard.id, labelId: urgentLabel.id },
        { cardId: activeCard.id, labelId: bugLabel.id },
        { cardId: onboardingEmailCard.id, labelId: designLabel.id },
        { cardId: analyticsCard.id, labelId: featureLabel.id },
        { cardId: billingMigrationCard.id, labelId: urgentLabel.id },
        { cardId: emptyStatesCard.id, labelId: designLabel.id },
        { cardId: changelogCard.id, labelId: featureLabel.id },
    ])

    await db.insert(schema.checklistItems).values([
        {
            cardId: activeCard.id,
            text: 'Reproduce on staging',
            done: true,
            position: 0,
        },
        { cardId: activeCard.id, text: 'Ship a fix', done: false, position: 1 },
        {
            cardId: activeCard.id,
            text: 'Add a regression test',
            done: false,
            position: 2,
        },
        {
            cardId: billingMigrationCard.id,
            text: 'Point staging at the new API',
            done: true,
            position: 0,
        },
        {
            cardId: billingMigrationCard.id,
            text: 'Backfill existing subscriptions',
            done: true,
            position: 1,
        },
        {
            cardId: billingMigrationCard.id,
            text: 'Update webhook handlers',
            done: false,
            position: 2,
        },
        {
            cardId: billingMigrationCard.id,
            text: 'Flip the flag in prod',
            done: false,
            position: 3,
        },
    ])

    await db.insert(schema.comments).values([
        {
            cardId: activeCard.id,
            authorId: carol.id,
            body: 'Confirmed it only happens on 3G — investigating the retry logic.',
        },
        {
            cardId: activeCard.id,
            authorId: alice.id,
            body: 'Thanks for the update, keep me posted.',
        },
    ])

    await db.insert(schema.activityEvents).values([
        {
            boardId: board.id,
            actorId: alice.id,
            type: 'board.created',
            newValue: board.name,
        },
        {
            boardId: board.id,
            cardId: overdueCard.id,
            actorId: bob.id,
            type: 'card.created',
        },
        {
            boardId: board.id,
            cardId: activeCard.id,
            actorId: carol.id,
            type: 'card.created',
        },
        {
            boardId: board.id,
            cardId: activeCard.id,
            actorId: carol.id,
            type: 'comment.added',
        },
        {
            boardId: board.id,
            cardId: archivedCard.id,
            actorId: alice.id,
            type: 'card.archived',
        },
    ])

    console.log('Seeding: watcher + unread notification…')
    // Alice watches the bug card without being its assignee.
    await db
        .insert(schema.cardWatchers)
        .values([{ cardId: activeCard.id, userId: alice.id }])
    // Bob has one unread notification (a mention from Carol).
    await db.insert(schema.notifications).values({
        userId: bob.id,
        boardId: board.id,
        cardId: activeCard.id,
        actorId: carol.id,
        type: 'comment.mentioned',
        title: 'Carol Nguyen mentioned you on "Fix onboarding checklist bug"',
    })

    console.log('Seeding: pending + expired invitations…')
    await db.insert(schema.invitations).values([
        {
            boardId: board.id,
            email: 'erin@example.com',
            invitedByUserId: alice.id,
            token: randomBytes(32).toString('hex'), // never redeemable — plain value, not a valid hash
            status: 'pending',
            expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
        },
        {
            boardId: board.id,
            email: 'frank@example.com',
            invitedByUserId: alice.id,
            token: randomBytes(32).toString('hex'),
            status: 'expired',
            expiresAt: new Date(now - 24 * 60 * 60 * 1000), // expired state
        },
    ])

    console.log('Seeding: closed board (archived-board state)…')
    const [closedBoard] = await db
        .insert(schema.boards)
        .values({
            name: 'Q1 Retro (closed)',
            ownerId: alice.id,
            status: 'closed',
            closedAt: new Date(),
        })
        .returning()
    await db
        .insert(schema.boardMemberships)
        .values({ boardId: closedBoard.id, userId: alice.id, role: 'owner' })

    console.log('Seed complete.')
    console.log(
        'Login as alice@example.com / bob@example.com / carol@example.com with password "password123".'
    )
    console.log(
        'dave@example.com (same password) is NOT a member of "Product Launch" — use it to exercise the permission-restricted state.'
    )
    console.log(
        'grace@example.com (same password) is an OBSERVER on "Product Launch" — read-only, every mutation is rejected.'
    )

    await client.end()
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
