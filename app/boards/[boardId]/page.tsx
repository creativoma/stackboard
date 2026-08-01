import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/session'
import { getMembership } from '@/lib/auth/membership'
import { isActiveMember, isBoardOwner } from '@/lib/domain/authorization'
import {
    getActiveColumnsWithCards,
    getBoard,
    getBoardLabels,
    getBoardMembers,
} from '@/lib/queries/board'
import { matchesFilters } from '@/lib/domain/filters'
import { FilterBar } from './filter-bar'
import { BoardBoard } from './board-board'
import { NewColumnForm } from './new-column-form'
import type { CardSummary } from './board-types'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ boardId: string }>
}): Promise<Metadata> {
    const { boardId } = await params
    const board = await getBoard(boardId)
    return { title: board?.name ?? 'Board' }
}

export default async function BoardPage({
    params,
    searchParams,
}: {
    params: Promise<{ boardId: string }>
    searchParams: Promise<{
        member?: string
        label?: string
        overdue?: string
        q?: string
    }>
}) {
    const { boardId } = await params
    const sp = await searchParams
    const user = await requireUser()

    const [board, membership] = await Promise.all([
        getBoard(boardId),
        getMembership(boardId, user.id),
    ])
    if (!board) notFound()
    if (!isActiveMember(membership)) {
        return (
            <div className="card-surface text-center py-16">
                <h1 className="text-xl font-semibold mb-2">
                    You don&apos;t have access to this board
                </h1>
                <p className="text-[var(--color-smoke)]">
                    Ask the board owner to invite you, or check that you&apos;re
                    logged in with the right account.
                </p>
            </div>
        )
    }
    if (board.status === 'closed') {
        return (
            <div className="card-surface text-center py-16">
                <h1 className="text-xl font-semibold mb-2">
                    {board.name} is closed
                </h1>
                <p className="text-[var(--color-smoke)]">
                    This board was permanently closed and can no longer be
                    edited.
                </p>
                <Link
                    href="/boards"
                    className="text-[var(--color-electric-blue)] mt-3 inline-block"
                >
                    Back to your boards
                </Link>
            </div>
        )
    }

    const [{ columns, cards }, members, labels] = await Promise.all([
        getActiveColumnsWithCards(boardId),
        getBoardMembers(boardId),
        getBoardLabels(boardId),
    ])

    const filters = {
        member: sp.member,
        label: sp.label,
        overdue: sp.overdue === '1',
        q: sp.q,
    }
    const filteredCards = cards.filter((c) => matchesFilters(c, filters))

    const cardsByColumn: Record<string, CardSummary[]> = {}
    for (const column of columns) {
        cardsByColumn[column.id] = filteredCards
            .filter((c) => c.columnId === column.id)
            .map((c) => ({
                id: c.id,
                boardId,
                columnId: c.columnId,
                title: c.title,
                description: c.description,
                assigneeId: c.assigneeId,
                dueDate: c.dueDate ? c.dueDate.toISOString() : null,
                position: c.position,
                labelIds: c.labelIds,
                checklist: c.checklist,
            }))
    }

    const canManage = isBoardOwner(membership)

    return (
        <div
            className="relative flex flex-col gap-4 h-full rounded-[var(--radius-largecards)] p-4 sm:p-6 overflow-hidden"
            style={{
                background:
                    'radial-gradient(140% 120% at 100% 0%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 40%), linear-gradient(155deg, #1090df 0%, var(--color-board-blue) 45%, #005a94 100%)',
            }}
        >
            <div
                className="pointer-events-none absolute inset-0"
                style={{ background: 'rgba(0,0,0,0.10)' }}
                aria-hidden="true"
            />
            <div className="relative flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-[26px] font-bold tracking-[-0.02em] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.2)]">
                        {board.name}
                    </h1>
                    <p className="text-sm text-white/80 font-medium">
                        {columns.length} column{columns.length === 1 ? '' : 's'}{' '}
                        · {cards.length} card{cards.length === 1 ? '' : 's'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {members.length > 0 ? (
                        <div
                            className="flex items-center -space-x-2"
                            aria-label={`${members.length} member${members.length === 1 ? '' : 's'}`}
                        >
                            {members.slice(0, 5).map((m) => (
                                <span
                                    key={m.user.id}
                                    className="w-7 h-7 rounded-full bg-[#1c7fc4] text-white text-[11px] font-semibold flex items-center justify-center ring-2 ring-white/70 shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
                                    title={m.user.name}
                                >
                                    {m.user.name.slice(0, 1).toUpperCase()}
                                </span>
                            ))}
                            {members.length > 5 ? (
                                <span className="w-7 h-7 rounded-full bg-[#1c7fc4] text-white text-[11px] font-semibold flex items-center justify-center ring-2 ring-white/70 shadow-[0_1px_3px_rgba(0,0,0,0.25)]">
                                    +{members.length - 5}
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                    <Link
                        href={`/boards/${boardId}/settings`}
                        className="rounded-[var(--radius-buttons)] px-3.5 py-2 text-sm font-semibold text-white bg-white/16 hover:bg-white/28 transition-colors"
                    >
                        Settings
                    </Link>
                </div>
            </div>

            <div className="relative bg-[var(--color-paper)] rounded-[var(--radius-cards)] p-3 shadow-[var(--shadow-elevated)]">
                <FilterBar
                    boardId={boardId}
                    members={members.map((m) => m.user)}
                    labels={labels}
                    filters={{ ...sp }}
                />
            </div>

            {columns.length === 0 ? (
                <div className="bg-[var(--color-paper)] rounded-[var(--radius-cards)] text-center py-16">
                    <p className="text-[var(--color-smoke)] mb-3">
                        No active columns yet.
                    </p>
                    <NewColumnForm boardId={boardId} />
                </div>
            ) : (
                <>
                    <BoardBoard
                        boardId={boardId}
                        columns={columns}
                        cardsByColumn={cardsByColumn}
                        members={members.map((m) => m.user)}
                        labels={labels}
                        canManage={canManage}
                    />
                    <NewColumnForm boardId={boardId} />
                </>
            )}
        </div>
    )
}

export const dynamic = 'force-dynamic'
