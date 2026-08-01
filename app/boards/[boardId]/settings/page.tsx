import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/session'
import { getMembership } from '@/lib/auth/membership'
import { isActiveMember, isBoardOwner } from '@/lib/domain/authorization'
import {
    getActiveColumns,
    getArchivedCards,
    getArchivedColumns,
    getBoard,
    getBoardMembers,
} from '@/lib/queries/board'
import { getPendingInvitationsForBoard } from '@/lib/queries/invitations'
import { ArchiveRestoreControls } from '../cards/[cardId]/card-fields'
import {
    RenameBoardForm,
    InviteMemberForm,
    RevokeInvitationButton,
    RemoveMemberButton,
    ColumnOrderRow,
    CloseBoardButton,
} from './settings-forms'
import { RestoreColumnButton } from './restore-column-button'

export const metadata: Metadata = { title: 'Board settings' }

export default async function BoardSettingsPage({
    params,
}: {
    params: Promise<{ boardId: string }>
}) {
    const { boardId } = await params
    const user = await requireUser()

    const [board, membership] = await Promise.all([
        getBoard(boardId),
        getMembership(boardId, user.id),
    ])
    if (!board) notFound()
    if (!isActiveMember(membership)) {
        return (
            <div className="card-surface text-center py-16">
                <h1 className="text-xl font-semibold">
                    You don&apos;t have access to this board
                </h1>
            </div>
        )
    }

    const owner = isBoardOwner(membership)

    const [
        members,
        activeColumns,
        archivedColumns,
        archivedCards,
        pendingInvites,
    ] = await Promise.all([
        getBoardMembers(boardId),
        getActiveColumns(boardId),
        getArchivedColumns(boardId),
        getArchivedCards(boardId),
        owner ? getPendingInvitationsForBoard(boardId) : Promise.resolve([]),
    ])

    return (
        <div className="flex flex-col gap-10 max-w-[720px]">
            <div>
                <Link
                    href={`/boards/${boardId}`}
                    className="text-sm text-[var(--color-electric-blue)]"
                >
                    &larr; {board.name}
                </Link>
                <h1 className="text-[24px] font-semibold tracking-[-0.02em] mt-1">
                    Board settings
                </h1>
            </div>

            {owner ? (
                <section
                    aria-labelledby="name-heading"
                    className="card-surface"
                >
                    <h2 id="name-heading" className="eyebrow mb-3">
                        Board name
                    </h2>
                    <RenameBoardForm boardId={boardId} name={board.name} />
                </section>
            ) : null}

            <section aria-labelledby="members-heading" className="card-surface">
                <h2 id="members-heading" className="eyebrow mb-3">
                    Members
                </h2>
                <ul className="flex flex-col">
                    {members.map(({ user: member, role }) => (
                        <li
                            key={member.id}
                            className="flex items-center justify-between py-2 border-b border-[var(--color-mist)] last:border-0"
                        >
                            <div>
                                <p className="text-sm font-medium">
                                    {member.name}
                                </p>
                                <p className="text-xs text-[var(--color-fog)]">
                                    {member.email} · {role}
                                </p>
                            </div>
                            {owner && role !== 'owner' ? (
                                <RemoveMemberButton
                                    boardId={boardId}
                                    userId={member.id}
                                    userName={member.name}
                                />
                            ) : null}
                        </li>
                    ))}
                </ul>

                {owner ? (
                    <div className="mt-4 pt-4 border-t border-[var(--color-mist)] flex flex-col gap-3">
                        <InviteMemberForm boardId={boardId} />
                        {pendingInvites.length > 0 ? (
                            <ul className="flex flex-col gap-1">
                                {pendingInvites.map((inv) => (
                                    <li
                                        key={inv.id}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <span>
                                            {inv.email}{' '}
                                            <span className="text-xs text-[var(--color-fog)]">
                                                pending
                                            </span>
                                        </span>
                                        <RevokeInvitationButton
                                            boardId={boardId}
                                            invitationId={inv.id}
                                        />
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                ) : null}
            </section>

            <section aria-labelledby="columns-heading" className="card-surface">
                <h2 id="columns-heading" className="eyebrow mb-3">
                    Column order
                </h2>
                <ul>
                    {activeColumns.map((col, i) => (
                        <ColumnOrderRow
                            key={col.id}
                            boardId={boardId}
                            columnId={col.id}
                            name={col.name}
                            index={i}
                            count={activeColumns.length}
                        />
                    ))}
                </ul>
            </section>

            {archivedColumns.length > 0 ? (
                <section
                    aria-labelledby="archived-columns-heading"
                    className="card-surface"
                >
                    <h2 id="archived-columns-heading" className="eyebrow mb-3">
                        Archived columns
                    </h2>
                    <ul>
                        {archivedColumns.map((col) => (
                            <li
                                key={col.id}
                                className="flex items-center justify-between py-2 border-b border-[var(--color-mist)] last:border-0"
                            >
                                <span className="text-sm">{col.name}</span>
                                <RestoreColumnButton
                                    boardId={boardId}
                                    columnId={col.id}
                                />
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {archivedCards.length > 0 ? (
                <section
                    aria-labelledby="archived-cards-heading"
                    className="card-surface"
                >
                    <h2 id="archived-cards-heading" className="eyebrow mb-3">
                        Archived cards
                    </h2>
                    <ul className="flex flex-col gap-3">
                        {archivedCards.map((card) => (
                            <li
                                key={card.id}
                                className="flex items-center justify-between gap-3 py-2 border-b border-[var(--color-mist)] last:border-0"
                            >
                                <Link
                                    href={`/boards/${boardId}/cards/${card.id}`}
                                    className="text-sm font-medium hover:underline"
                                >
                                    {card.title}
                                </Link>
                                <ArchiveRestoreControls
                                    boardId={boardId}
                                    cardId={card.id}
                                    status="archived"
                                    activeColumns={activeColumns}
                                />
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {owner ? (
                <section
                    aria-labelledby="danger-heading"
                    className="card-surface"
                >
                    <h2
                        id="danger-heading"
                        className="eyebrow mb-3 text-[var(--color-coral)]"
                    >
                        Danger zone
                    </h2>
                    <p className="text-sm text-[var(--color-smoke)] mb-3">
                        Closing a board is permanent. Members lose access and
                        the board moves to the archived list.
                    </p>
                    <CloseBoardButton boardId={boardId} />
                </section>
            ) : null}
        </div>
    )
}

export const dynamic = 'force-dynamic'
