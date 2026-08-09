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

    const [alice, bob, carol, dave, grace, henry, ivy] = await db
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
            }, // not a member of "Product Launch" — permission-restricted state
            {
                name: 'Grace Kim',
                email: 'grace@example.com',
                passwordHash: password,
            }, // observer — read-only member state
            {
                name: 'Henry Osei',
                email: 'henry@example.com',
                passwordHash: password,
            },
            {
                name: 'Ivy Chen',
                email: 'ivy@example.com',
                passwordHash: password,
            },
        ])
        .returning()

    const now = Date.now()
    const days = (n: number) => new Date(now + n * 24 * 60 * 60 * 1000)

    // ── Board 1: Product Launch — the comprehensive happy-path board ──────
    console.log('Seeding: "Product Launch" board (happy path, blue)…')
    const [board] = await db
        .insert(schema.boards)
        .values({ name: 'Product Launch', ownerId: alice.id, color: 'blue' })
        .returning()

    await db.insert(schema.boardMemberships).values([
        { boardId: board.id, userId: alice.id, role: 'owner' },
        { boardId: board.id, userId: bob.id, role: 'member' },
        { boardId: board.id, userId: carol.id, role: 'member' },
        { boardId: board.id, userId: grace.id, role: 'observer' },
    ])

    const [todo, inProgress, done, blocked] = await db
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
    void blocked

    const [urgentLabel, bugLabel, featureLabel, designLabel] = await db
        .insert(schema.labels)
        .values([
            { boardId: board.id, name: 'Urgent', color: 'red' },
            { boardId: board.id, name: 'Bug', color: 'purple' },
            { boardId: board.id, name: 'Feature', color: 'green' },
            { boardId: board.id, name: 'Design', color: 'blue' },
        ])
        .returning()

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
                dueDate: days(-3), // overdue state
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
                dueDate: days(5),
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
                archivedAt: days(-10), // archived state
            },
            {
                boardId: board.id,
                columnId: todo.id,
                title: 'Design onboarding email sequence',
                description: 'Three-part welcome series for new signups.',
                assigneeId: carol.id,
                priority: 'medium',
                dueDate: days(2),
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
                dueDate: days(1),
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
            expiresAt: days(7),
        },
        {
            boardId: board.id,
            email: 'frank@example.com',
            invitedByUserId: alice.id,
            token: randomBytes(32).toString('hex'),
            status: 'expired',
            expiresAt: days(-1), // expired state
        },
    ])

    // ── Board 2: Marketing Website Redesign — five-column pipeline, purple ─
    console.log('Seeding: "Marketing Website Redesign" board (purple)…')
    const [marketingBoard] = await db
        .insert(schema.boards)
        .values({
            name: 'Marketing Website Redesign',
            ownerId: bob.id,
            color: 'purple',
        })
        .returning()

    await db.insert(schema.boardMemberships).values([
        { boardId: marketingBoard.id, userId: bob.id, role: 'owner' },
        { boardId: marketingBoard.id, userId: alice.id, role: 'member' },
        { boardId: marketingBoard.id, userId: henry.id, role: 'member' },
        { boardId: marketingBoard.id, userId: ivy.id, role: 'member' },
    ])

    const [backlog, design, dev, review, live] = await db
        .insert(schema.columns)
        .values([
            { boardId: marketingBoard.id, name: 'Backlog', position: 0 },
            { boardId: marketingBoard.id, name: 'Design', position: 1 },
            {
                boardId: marketingBoard.id,
                name: 'Development',
                position: 2,
                wipLimit: 2, // at-capacity WIP state (see cards below)
            },
            { boardId: marketingBoard.id, name: 'Review', position: 3 },
            { boardId: marketingBoard.id, name: 'Live', position: 4 },
        ])
        .returning()

    const [mktContentLabel, mktSeoLabel, mktA11yLabel] = await db
        .insert(schema.labels)
        .values([
            { boardId: marketingBoard.id, name: 'Content', color: 'yellow' },
            { boardId: marketingBoard.id, name: 'SEO', color: 'green' },
            {
                boardId: marketingBoard.id,
                name: 'Accessibility',
                color: 'blue',
            },
        ])
        .returning()

    const [heroCard, navCard, devCardA, devCardB, reviewCard, liveCard] =
        await db
            .insert(schema.cards)
            .values([
                {
                    boardId: marketingBoard.id,
                    columnId: backlog.id,
                    title: 'Rewrite homepage hero copy',
                    description: 'Lead with the new positioning statement.',
                    assigneeId: ivy.id,
                    priority: 'medium',
                    position: 0,
                },
                {
                    boardId: marketingBoard.id,
                    columnId: backlog.id,
                    title: 'Audit navigation IA',
                    description: 'Too many top-level items; needs pruning.',
                    position: 1,
                },
                {
                    boardId: marketingBoard.id,
                    columnId: design.id,
                    title: 'Pricing page mockups',
                    description: 'Three tiers, annual/monthly toggle.',
                    assigneeId: henry.id,
                    priority: 'high',
                    dueDate: days(4),
                    position: 0,
                },
                {
                    boardId: marketingBoard.id,
                    columnId: dev.id,
                    title: 'Build responsive nav component',
                    description: 'Matches the new IA from the design review.',
                    assigneeId: bob.id,
                    priority: 'high',
                    dueDate: days(3),
                    position: 0,
                },
                {
                    boardId: marketingBoard.id,
                    columnId: dev.id,
                    title: 'Wire up contact form',
                    description: 'Posts to the marketing CRM webhook.',
                    assigneeId: alice.id,
                    priority: 'medium',
                    position: 1,
                }, // fills the "Development" WIP limit of 2
                {
                    boardId: marketingBoard.id,
                    columnId: review.id,
                    title: 'Footer sitemap links',
                    description: 'Awaiting sign-off from legal.',
                    assigneeId: ivy.id,
                    position: 0,
                },
                {
                    boardId: marketingBoard.id,
                    columnId: live.id,
                    title: 'Launch new blog template',
                    description: 'Shipped last sprint.',
                    assigneeId: bob.id,
                    position: 0,
                },
            ])
            .returning()

    await db.insert(schema.cardLabels).values([
        { cardId: heroCard.id, labelId: mktContentLabel.id },
        { cardId: navCard.id, labelId: mktA11yLabel.id },
        { cardId: devCardA.id, labelId: mktA11yLabel.id },
        { cardId: devCardB.id, labelId: mktSeoLabel.id },
        { cardId: reviewCard.id, labelId: mktContentLabel.id },
        { cardId: liveCard.id, labelId: mktSeoLabel.id },
    ])

    await db.insert(schema.checklistItems).values([
        {
            cardId: devCardA.id,
            text: 'Keyboard-navigable menu',
            done: true,
            position: 0,
        },
        {
            cardId: devCardA.id,
            text: 'Screen-reader labels',
            done: false,
            position: 1,
        },
    ])

    await db.insert(schema.comments).values([
        {
            cardId: reviewCard.id,
            authorId: bob.id,
            body: 'Pinging legal again — this has been sitting for a week.',
        },
    ])

    await db.insert(schema.activityEvents).values([
        {
            boardId: marketingBoard.id,
            actorId: bob.id,
            type: 'board.created',
            newValue: marketingBoard.name,
        },
        {
            boardId: marketingBoard.id,
            cardId: liveCard.id,
            actorId: bob.id,
            type: 'card.moved',
            field: 'column',
            oldValue: 'Review',
            newValue: 'Live',
        },
    ])

    // ── Board 3: Mobile App v2 — larger, mostly overdue/urgent, green ──────
    console.log('Seeding: "Mobile App v2" board (green, high pressure)…')
    const [mobileBoard] = await db
        .insert(schema.boards)
        .values({ name: 'Mobile App v2', ownerId: carol.id, color: 'green' })
        .returning()

    await db.insert(schema.boardMemberships).values([
        { boardId: mobileBoard.id, userId: carol.id, role: 'owner' },
        { boardId: mobileBoard.id, userId: alice.id, role: 'member' },
        { boardId: mobileBoard.id, userId: bob.id, role: 'member' },
        { boardId: mobileBoard.id, userId: henry.id, role: 'member' },
        { boardId: mobileBoard.id, userId: ivy.id, role: 'member' },
        { boardId: mobileBoard.id, userId: grace.id, role: 'observer' },
    ])

    const [mobileTodo, mobileInProgress, mobileQa, mobileDone] = await db
        .insert(schema.columns)
        .values([
            { boardId: mobileBoard.id, name: 'To do', position: 0 },
            { boardId: mobileBoard.id, name: 'In progress', position: 1 },
            { boardId: mobileBoard.id, name: 'QA', position: 2 },
            { boardId: mobileBoard.id, name: 'Done', position: 3 },
        ])
        .returning()

    const [mobileCrashLabel, mobilePerfLabel, mobileUxLabel] = await db
        .insert(schema.labels)
        .values([
            { boardId: mobileBoard.id, name: 'Crash', color: 'red' },
            { boardId: mobileBoard.id, name: 'Performance', color: 'orange' },
            { boardId: mobileBoard.id, name: 'UX', color: 'purple' },
        ])
        .returning()

    const mobileCards = await db
        .insert(schema.cards)
        .values([
            {
                boardId: mobileBoard.id,
                columnId: mobileTodo.id,
                title: 'Investigate startup crash on Android 12',
                description: 'Crash-free rate dropped 4% after last release.',
                assigneeId: henry.id,
                priority: 'highest',
                dueDate: days(-5), // overdue
                position: 0,
            },
            {
                boardId: mobileBoard.id,
                columnId: mobileTodo.id,
                title: 'Support dynamic type / large fonts',
                description: 'Accessibility request from three users.',
                assigneeId: ivy.id,
                priority: 'low',
                position: 1,
            },
            {
                boardId: mobileBoard.id,
                columnId: mobileTodo.id,
                title: 'Add biometric login',
                description: 'Face ID / fingerprint unlock.',
                priority: 'medium',
                position: 2,
            },
            {
                boardId: mobileBoard.id,
                columnId: mobileInProgress.id,
                title: 'Reduce cold start time',
                description: 'Currently 2.8s on mid-tier Android devices.',
                assigneeId: carol.id,
                priority: 'high',
                dueDate: days(-1), // overdue
                position: 0,
            },
            {
                boardId: mobileBoard.id,
                columnId: mobileInProgress.id,
                title: 'Offline mode for the board list',
                description: 'Cache the last-seen boards for offline viewing.',
                assigneeId: bob.id,
                priority: 'medium',
                dueDate: days(6),
                position: 1,
            },
            {
                boardId: mobileBoard.id,
                columnId: mobileQa.id,
                title: 'Regression pass on card drag-and-drop',
                description: 'Touch targets felt off in the last build.',
                assigneeId: alice.id,
                priority: 'high',
                dueDate: days(2),
                position: 0,
            },
            {
                boardId: mobileBoard.id,
                columnId: mobileDone.id,
                title: 'Push notification opt-in flow',
                description: 'Shipped in 2.4.0.',
                assigneeId: carol.id,
                position: 0,
            },
            {
                boardId: mobileBoard.id,
                columnId: mobileDone.id,
                title: 'Dark mode for the mobile app',
                description: 'Shipped in 2.3.0.',
                assigneeId: henry.id,
                position: 1,
            },
        ])
        .returning()
    const [crashCard, dynamicTypeCard, , coldStartCard, offlineCard, dragCard] =
        mobileCards

    await db.insert(schema.cardLabels).values([
        { cardId: crashCard.id, labelId: mobileCrashLabel.id },
        { cardId: coldStartCard.id, labelId: mobilePerfLabel.id },
        { cardId: dynamicTypeCard.id, labelId: mobileUxLabel.id },
        { cardId: dragCard.id, labelId: mobileUxLabel.id },
        { cardId: offlineCard.id, labelId: mobilePerfLabel.id },
    ])

    await db.insert(schema.checklistItems).values([
        {
            cardId: crashCard.id,
            text: 'Pull crash logs from the last release',
            done: true,
            position: 0,
        },
        {
            cardId: crashCard.id,
            text: 'Reproduce locally on a Pixel 6',
            done: true,
            position: 1,
        },
        {
            cardId: crashCard.id,
            text: 'Bisect to the offending commit',
            done: false,
            position: 2,
        },
        {
            cardId: crashCard.id,
            text: 'Ship a hotfix build',
            done: false,
            position: 3,
        },
    ])

    await db.insert(schema.comments).values([
        {
            cardId: crashCard.id,
            authorId: henry.id,
            body: 'Narrowed it to the new analytics SDK init — testing a fix now.',
        },
        {
            cardId: crashCard.id,
            authorId: carol.id,
            body: 'This is our top priority until it ships, thanks for jumping on it.',
        },
    ])

    await db.insert(schema.cardWatchers).values([
        { cardId: crashCard.id, userId: carol.id },
        { cardId: crashCard.id, userId: alice.id },
    ])

    await db.insert(schema.notifications).values([
        {
            userId: henry.id,
            boardId: mobileBoard.id,
            cardId: crashCard.id,
            actorId: carol.id,
            type: 'comment.added',
            title: 'Carol Nguyen commented on "Investigate startup crash on Android 12"',
            readAt: new Date(),
        },
        {
            userId: alice.id,
            boardId: mobileBoard.id,
            cardId: dragCard.id,
            actorId: carol.id,
            type: 'card.assigned',
            title: 'You were assigned "Regression pass on card drag-and-drop"',
        },
    ])

    // ── Board 4: Support Triage — small, mostly empty, orange ──────────────
    console.log('Seeding: "Support Triage" board (orange, sparse)…')
    const [supportBoard] = await db
        .insert(schema.boards)
        .values({ name: 'Support Triage', ownerId: alice.id, color: 'orange' })
        .returning()

    await db.insert(schema.boardMemberships).values([
        { boardId: supportBoard.id, userId: alice.id, role: 'owner' },
        { boardId: supportBoard.id, userId: dave.id, role: 'member' },
    ])

    const [inboxCol, resolvedCol] = await db
        .insert(schema.columns)
        .values([
            { boardId: supportBoard.id, name: 'Inbox', position: 0 },
            { boardId: supportBoard.id, name: 'Resolved', position: 1 },
        ])
        .returning()

    await db.insert(schema.cards).values([
        {
            boardId: supportBoard.id,
            columnId: inboxCol.id,
            title: 'Customer cannot reset password',
            description: 'Reset email never arrives — check the job queue.',
            assigneeId: dave.id,
            priority: 'high',
            position: 0,
        },
        {
            boardId: supportBoard.id,
            columnId: resolvedCol.id,
            title: 'Duplicate invoice sent to customer',
            description: 'Refunded and apologized.',
            assigneeId: alice.id,
            position: 0,
        },
    ])
    // "Resolved" column stays otherwise empty — exercises the near-empty list state.

    // ── Board 5: New Team Onboarding — fully empty board (no columns) ──────
    console.log('Seeding: "New Team Onboarding" board (empty-board state)…')
    const [emptyBoard] = await db
        .insert(schema.boards)
        .values({
            name: 'New Team Onboarding',
            ownerId: bob.id,
            color: 'yellow',
        })
        .returning()

    await db
        .insert(schema.boardMemberships)
        .values([{ boardId: emptyBoard.id, userId: bob.id, role: 'owner' }])
    // No columns, no cards — exercises the "create your first column" empty state.

    // ── Closed boards — archived-board state on the dashboard ─────────────
    console.log('Seeding: closed boards (archived-board state)…')
    const [closedBoard] = await db
        .insert(schema.boards)
        .values({
            name: 'Q1 Retro (closed)',
            ownerId: alice.id,
            status: 'closed',
            closedAt: days(-30),
        })
        .returning()
    await db
        .insert(schema.boardMemberships)
        .values({ boardId: closedBoard.id, userId: alice.id, role: 'owner' })

    const [oldRoadmapBoard] = await db
        .insert(schema.boards)
        .values({
            name: '2025 Roadmap (closed)',
            ownerId: carol.id,
            status: 'closed',
            color: 'purple',
            closedAt: days(-90),
        })
        .returning()
    await db.insert(schema.boardMemberships).values([
        { boardId: oldRoadmapBoard.id, userId: carol.id, role: 'owner' },
        { boardId: oldRoadmapBoard.id, userId: bob.id, role: 'member' },
    ])

    console.log('Seed complete.')
    console.log(
        'Login as alice@example.com / bob@example.com / carol@example.com / henry@example.com / ivy@example.com with password "password123".'
    )
    console.log(
        'dave@example.com (same password) is only a member of "Support Triage" — use it to exercise the permission-restricted state on other boards.'
    )
    console.log(
        'grace@example.com (same password) is an OBSERVER on "Product Launch" and "Mobile App v2" — read-only, every mutation is rejected.'
    )

    await client.end()
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
