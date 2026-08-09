import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Archive, ListOrdered, ShieldAlert, Users } from 'lucide-react'
import { Button } from '@/app/_components/button'
import { Avatar } from '@/app/_components/avatar-stack'
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
import {
    RenameBoardForm,
    InviteMemberForm,
    RevokeInvitationButton,
    RemoveMemberButton,
    ColumnOrderList,
    CloseBoardButton,
} from './settings-forms'
import { ArchiveDrawer } from './archive-drawer'

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
            <div className="card-surface text-center py-10">
                <h1 className="text-[15px] font-medium tracking-[-0.1px]">
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

    const archivedCount = archivedColumns.length + archivedCards.length

    return (
        <div className="flex flex-col gap-8 max-w-[640px]">
            <div>
                <Button href={`/boards/${boardId}`} variant="ghost">
                    &larr; {board.name}
                </Button>
                <h1 className="text-[16px] font-medium tracking-[-0.2px] mt-1">
                    Board settings
                </h1>
                <p className="text-[var(--color-smoke)] mt-1 text-sm">
                    Manage the name, members, and columns for this board.
                </p>
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
                <h2
                    id="members-heading"
                    className="eyebrow mb-3 flex items-center gap-1.5"
                >
                    <Users size={13} strokeWidth={2.5} aria-hidden="true" />
                    Members
                </h2>
                <ul className="flex flex-col">
                    {members.map(({ user: member, role, joinedAt }) => (
                        <li
                            key={member.id}
                            className="flex items-center gap-3 py-2.5 border-b border-[var(--color-mist)] last:border-0"
                        >
                            <Avatar
                                person={{ ...member, role, joinedAt }}
                                size="md"
                                boardId={boardId}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">
                                    {member.name}
                                </p>
                                <p className="text-xs text-[var(--color-fog)] truncate">
                                    {member.email}
                                </p>
                            </div>
                            <span className="pill bg-[var(--color-sunken)] text-[var(--color-smoke)] shrink-0">
                                {role}
                            </span>
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
                <h2
                    id="columns-heading"
                    className="eyebrow mb-3 flex items-center gap-1.5"
                >
                    <ListOrdered
                        size={13}
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    Column order
                </h2>
                <ColumnOrderList
                    boardId={boardId}
                    columns={activeColumns.map((col) => ({
                        id: col.id,
                        name: col.name,
                        wipLimit: col.wipLimit,
                    }))}
                    canSetWip={owner}
                />
            </section>

            {archivedCount > 0 ? (
                <section
                    aria-labelledby="archive-heading"
                    className="card-surface flex items-center justify-between gap-3"
                >
                    <div>
                        <h2
                            id="archive-heading"
                            className="eyebrow mb-1 flex items-center gap-1.5"
                        >
                            <Archive
                                size={13}
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            Archive
                        </h2>
                        <p className="text-sm text-[var(--color-smoke)]">
                            {archivedColumns.length} column
                            {archivedColumns.length === 1 ? '' : 's'} ·{' '}
                            {archivedCards.length} card
                            {archivedCards.length === 1 ? '' : 's'} archived
                        </p>
                    </div>
                    <ArchiveDrawer
                        boardId={boardId}
                        archivedColumns={archivedColumns}
                        archivedCards={archivedCards}
                        activeColumns={activeColumns}
                    />
                </section>
            ) : null}

            {owner ? (
                <section
                    aria-labelledby="danger-heading"
                    className="card-surface"
                >
                    <h2
                        id="danger-heading"
                        className="eyebrow mb-3 flex items-center gap-1.5 text-[var(--color-coral)]"
                    >
                        <ShieldAlert
                            size={13}
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
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
