import { sql } from 'drizzle-orm'
import {
    pgTable,
    uuid,
    text,
    timestamp,
    integer,
    boolean,
    jsonb,
    uniqueIndex,
    index,
    primaryKey,
    type AnyPgColumn,
} from 'drizzle-orm/pg-core'

/**
 * Users are the only tenant-independent table. Every other table is scoped
 * to a board (directly or via a card/column FK) which is the tenant boundary.
 */
export const users = pgTable(
    'users',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        email: text('email').notNull(),
        passwordHash: text('password_hash').notNull(),
        name: text('name').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [uniqueIndex('users_email_idx').on(t.email)]
)

// Server-side session store so sessions can be revoked (e.g. on membership removal).
export const sessions = pgTable(
    'sessions',
    {
        id: text('id').primaryKey(), // hashed token
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [index('sessions_user_idx').on(t.userId)]
)

export const boardStatusValues = ['active', 'closed'] as const
export type BoardStatus = (typeof boardStatusValues)[number]

export const boardColorValues = [
    'blue',
    'purple',
    'green',
    'yellow',
    'red',
    'orange',
] as const
export type BoardColor = (typeof boardColorValues)[number]

export const boards = pgTable(
    'boards',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        name: text('name').notNull(),
        ownerId: uuid('owner_id')
            .notNull()
            .references(() => users.id),
        status: text('status', { enum: boardStatusValues })
            .notNull()
            .default('active'),
        color: text('color', { enum: boardColorValues }),
        // Read-only share link, e.g. /p/<token>. Null = link sharing off.
        // Unlike session/invite tokens, this is stored in plaintext by
        // design — it only ever grants read access to already-non-secret
        // board content, and the owner needs to be able to look it up again
        // later without regenerating it (see README Security decisions).
        publicToken: text('public_token'),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        closedAt: timestamp('closed_at', { withTimezone: true }),
    },
    (t) => [uniqueIndex('boards_public_token_idx').on(t.publicToken)]
)

export const membershipRoleValues = ['owner', 'member', 'observer'] as const
export type MembershipRole = (typeof membershipRoleValues)[number]
export const membershipStatusValues = ['active', 'removed'] as const
export type MembershipStatus = (typeof membershipStatusValues)[number]

// The authorization boundary for every mutation: a row here with status
// 'active' is required before a user may touch anything under a board.
export const boardMemberships = pgTable(
    'board_memberships',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        boardId: uuid('board_id')
            .notNull()
            .references(() => boards.id, { onDelete: 'cascade' }),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        role: text('role', { enum: membershipRoleValues })
            .notNull()
            .default('member'),
        status: text('status', { enum: membershipStatusValues })
            .notNull()
            .default('active'),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        removedAt: timestamp('removed_at', { withTimezone: true }),
    },
    (t) => [uniqueIndex('memberships_board_user_idx').on(t.boardId, t.userId)]
)

export const invitationStatusValues = [
    'pending',
    'accepted',
    'revoked',
    'expired',
] as const
export type InvitationStatus = (typeof invitationStatusValues)[number]

export const invitations = pgTable(
    'invitations',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        boardId: uuid('board_id')
            .notNull()
            .references(() => boards.id, { onDelete: 'cascade' }),
        email: text('email').notNull(),
        invitedByUserId: uuid('invited_by_user_id')
            .notNull()
            .references(() => users.id),
        // Role granted on acceptance. Owners are never created by invite.
        role: text('role', { enum: membershipRoleValues })
            .notNull()
            .default('member'),
        token: text('token').notNull(), // hashed
        status: text('status', { enum: invitationStatusValues })
            .notNull()
            .default('pending'),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
        acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    },
    (t) => [
        uniqueIndex('invitations_token_idx').on(t.token),
        index('invitations_board_idx').on(t.boardId),
        // A given email can only have one *pending* invite per board; enforced in
        // application code (partial unique indexes need raw SQL, kept simple here).
    ]
)

export const columnStatusValues = ['active', 'archived'] as const
export type ColumnStatus = (typeof columnStatusValues)[number]

export const columns = pgTable(
    'columns',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        boardId: uuid('board_id')
            .notNull()
            .references(() => boards.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        position: integer('position').notNull(),
        status: text('status', { enum: columnStatusValues })
            .notNull()
            .default('active'),
        // Max active cards allowed to *enter* the column; null = unlimited.
        // Enforced in application code (lib/domain/wip.ts) on create/move.
        wipLimit: integer('wip_limit'),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        archivedAt: timestamp('archived_at', { withTimezone: true }),
    },
    (t) => [index('columns_board_idx').on(t.boardId, t.position)]
)

export const cardStatusValues = ['active', 'archived'] as const
export type CardStatus = (typeof cardStatusValues)[number]

export const cardPriorityValues = [
    'highest',
    'high',
    'medium',
    'low',
    'lowest',
] as const
export type CardPriority = (typeof cardPriorityValues)[number]

export const cards = pgTable(
    'cards',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        boardId: uuid('board_id')
            .notNull()
            .references(() => boards.id, { onDelete: 'cascade' }),
        columnId: uuid('column_id')
            .notNull()
            .references(() => columns.id, { onDelete: 'cascade' }),
        title: text('title').notNull(),
        description: text('description').notNull().default(''),
        assigneeId: uuid('assignee_id').references(() => users.id),
        // Optional start date, paired with dueDate to draw a Gantt bar
        // (lib/domain/gantt.ts). A card with only a dueDate renders as a
        // single-day bar/milestone rather than a range.
        startDate: timestamp('start_date', { withTimezone: true }),
        dueDate: timestamp('due_date', { withTimezone: true }),
        // Optional Jira-style priority; null means "no priority set".
        priority: text('priority', { enum: cardPriorityValues }),
        // Subtasks: a card whose parent is another card on the same board.
        // Set null (not cascade-deleted) if the parent is ever hard-deleted,
        // since cards are normally archived rather than removed.
        parentCardId: uuid('parent_card_id').references(
            (): AnyPgColumn => cards.id,
            { onDelete: 'set null' }
        ),
        position: integer('position').notNull(),
        status: text('status', { enum: cardStatusValues })
            .notNull()
            .default('active'),
        // Set once the due-soon reminder notification has gone out, so the
        // hourly scan never notifies twice for the same due date.
        dueReminderSentAt: timestamp('due_reminder_sent_at', {
            withTimezone: true,
        }),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        archivedAt: timestamp('archived_at', { withTimezone: true }),
    },
    (t) => [
        index('cards_column_idx').on(t.columnId, t.position),
        index('cards_board_idx').on(t.boardId),
        index('cards_assignee_idx').on(t.assigneeId),
        index('cards_parent_idx').on(t.parentCardId),
        // Expression index backing full-text card search (lib/queries/search.ts).
        index('cards_search_idx').using(
            'gin',
            sql`to_tsvector('simple', ${t.title} || ' ' || ${t.description})`
        ),
    ]
)

// "Blocked by" / "blocks" relationships between two cards on the same
// board. Directional: blockerCardId must complete before blockedCardId can.
// Cycle prevention is application-level (lib/domain/dependencies.ts) since
// Postgres can't express "no path back to here" declaratively.
export const cardDependencies = pgTable(
    'card_dependencies',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        boardId: uuid('board_id')
            .notNull()
            .references(() => boards.id, { onDelete: 'cascade' }),
        blockerCardId: uuid('blocker_card_id')
            .notNull()
            .references(() => cards.id, { onDelete: 'cascade' }),
        blockedCardId: uuid('blocked_card_id')
            .notNull()
            .references(() => cards.id, { onDelete: 'cascade' }),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        uniqueIndex('card_dependencies_pair_idx').on(
            t.blockerCardId,
            t.blockedCardId
        ),
        index('card_dependencies_blocked_idx').on(t.blockedCardId),
    ]
)

export const labels = pgTable(
    'labels',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        boardId: uuid('board_id')
            .notNull()
            .references(() => boards.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        color: text('color').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [uniqueIndex('labels_board_name_idx').on(t.boardId, t.name)]
)

export const cardLabels = pgTable(
    'card_labels',
    {
        cardId: uuid('card_id')
            .notNull()
            .references(() => cards.id, { onDelete: 'cascade' }),
        labelId: uuid('label_id')
            .notNull()
            .references(() => labels.id, { onDelete: 'cascade' }),
    },
    (t) => [primaryKey({ columns: [t.cardId, t.labelId] })]
)

export const checklistItems = pgTable(
    'checklist_items',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        cardId: uuid('card_id')
            .notNull()
            .references(() => cards.id, { onDelete: 'cascade' }),
        text: text('text').notNull(),
        done: boolean('done').notNull().default(false),
        position: integer('position').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [index('checklist_items_card_idx').on(t.cardId, t.position)]
)

export const comments = pgTable(
    'comments',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        cardId: uuid('card_id')
            .notNull()
            .references(() => cards.id, { onDelete: 'cascade' }),
        authorId: uuid('author_id')
            .notNull()
            .references(() => users.id),
        body: text('body').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [index('comments_card_idx').on(t.cardId, t.createdAt)]
)

export const jobStatusValues = [
    'pending',
    'processing',
    'done',
    'failed',
] as const
export type JobStatus = (typeof jobStatusValues)[number]

// Minimal Postgres-backed queue for work that shouldn't block a Server
// Action's request/response cycle (e.g. sending invite emails). Polled by
// the worker in db/jobs-worker.ts rather than requiring a separate queue
// service, consistent with this app's DB-backed-over-hosted-service bias.
export const jobs = pgTable(
    'jobs',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        type: text('type').notNull(), // e.g. 'send_invite_email'
        payload: jsonb('payload').notNull(),
        status: text('status', { enum: jobStatusValues })
            .notNull()
            .default('pending'),
        attempts: integer('attempts').notNull().default(0),
        lastError: text('last_error'),
        runAfter: timestamp('run_after', { withTimezone: true })
            .notNull()
            .defaultNow(),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [index('jobs_status_run_after_idx').on(t.status, t.runAfter)]
)

// Users subscribed to a card's notifications beyond the assignee. Assigning
// a card also adds the assignee here (see lib/actions/cards.ts).
export const cardWatchers = pgTable(
    'card_watchers',
    {
        cardId: uuid('card_id')
            .notNull()
            .references(() => cards.id, { onDelete: 'cascade' }),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [primaryKey({ columns: [t.cardId, t.userId] })]
)

export const notificationTypeValues = [
    'card.assigned',
    'comment.added',
    'comment.mentioned',
    'card.due_soon',
] as const
export type NotificationType = (typeof notificationTypeValues)[number]

// One row per recipient per event. Rows are only ever inserted and marked
// read (readAt) — never edited — so the list doubles as a personal audit log.
export const notifications = pgTable(
    'notifications',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        boardId: uuid('board_id')
            .notNull()
            .references(() => boards.id, { onDelete: 'cascade' }),
        cardId: uuid('card_id').references(() => cards.id, {
            onDelete: 'cascade',
        }),
        actorId: uuid('actor_id')
            .notNull()
            .references(() => users.id),
        type: text('type', { enum: notificationTypeValues }).notNull(),
        title: text('title').notNull(),
        readAt: timestamp('read_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [index('notifications_user_idx').on(t.userId, t.readAt, t.createdAt)]
)

// File metadata for card attachments. Bytes live outside the DB, addressed
// by storageKey through the object-storage adapter (lib/storage/).
export const attachments = pgTable(
    'attachments',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        boardId: uuid('board_id')
            .notNull()
            .references(() => boards.id, { onDelete: 'cascade' }),
        cardId: uuid('card_id')
            .notNull()
            .references(() => cards.id, { onDelete: 'cascade' }),
        uploaderId: uuid('uploader_id')
            .notNull()
            .references(() => users.id),
        filename: text('filename').notNull(),
        mimeType: text('mime_type').notNull(),
        sizeBytes: integer('size_bytes').notNull(),
        storageKey: text('storage_key').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [index('attachments_card_idx').on(t.cardId, t.createdAt)]
)

// Immutable append-only audit trail. Never updated or deleted by application code.
export const activityEvents = pgTable(
    'activity_events',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        boardId: uuid('board_id')
            .notNull()
            .references(() => boards.id, { onDelete: 'cascade' }),
        cardId: uuid('card_id').references(() => cards.id, {
            onDelete: 'cascade',
        }),
        actorId: uuid('actor_id')
            .notNull()
            .references(() => users.id),
        type: text('type').notNull(), // e.g. 'card.moved', 'card.archived', 'checklist.item.completed'
        field: text('field'),
        oldValue: text('old_value'),
        newValue: text('new_value'),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index('activity_board_idx').on(t.boardId, t.createdAt),
        index('activity_card_idx').on(t.cardId, t.createdAt),
    ]
)
