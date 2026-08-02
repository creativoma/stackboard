import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
    Download,
    LayoutGrid,
    Settings as SettingsIcon,
    UserPlus,
} from 'lucide-react'
import { Button } from '@/app/_components/button'
import { AvatarStack } from '@/app/_components/avatar-stack'
import { ProgressBar } from '@/app/_components/progress-bar'
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
                <Button
                    href="/boards"
                    variant="ghost"
                    className="!p-0 !min-h-0 mt-3 !inline-flex"
                >
                    Back to your boards
                </Button>
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

    const checklistDone = cards.reduce((sum, c) => sum + c.checklist.done, 0)
    const checklistTotal = cards.reduce((sum, c) => sum + c.checklist.total, 0)

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
                <div className="flex items-start gap-3 min-w-0">
                    <span
                        className="w-11 h-11 rounded-[var(--radius-cards)] flex items-center justify-center shrink-0 bg-white/16 text-white ring-1 ring-white/25"
                        aria-hidden="true"
                    >
                        <LayoutGrid size={20} strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-[26px] font-bold tracking-[-0.02em] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.2)] truncate">
                            {board.name}
                        </h1>
                        <p className="text-sm text-white/80 font-medium mb-1.5">
                            {columns.length} column
                            {columns.length === 1 ? '' : 's'} · {cards.length}{' '}
                            card{cards.length === 1 ? '' : 's'}
                        </p>
                        {checklistTotal > 0 ? (
                            <ProgressBar
                                value={checklistDone}
                                max={checklistTotal}
                                label={`${checklistDone} of ${checklistTotal} checklist items complete`}
                                trackClassName="bg-white/25"
                                className="w-56 max-w-full [&>span]:text-white/85"
                            />
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <AvatarStack people={members.map((m) => m.user)} onBoard />
                    <Button
                        href={`/boards/${boardId}/settings#invite-email`}
                        variant="onBoard"
                    >
                        <UserPlus size={15} strokeWidth={2.25} />
                        Add Member
                    </Button>
                    <Button
                        href={`/boards/${boardId}/export`}
                        external
                        variant="onBoard"
                        aria-label="Export board"
                        title="Export board"
                    >
                        <Download size={15} strokeWidth={2.25} />
                    </Button>
                    <Button
                        href={`/boards/${boardId}/settings`}
                        variant="onBoard"
                        aria-label="Board settings"
                        title="Board settings"
                    >
                        <SettingsIcon size={15} strokeWidth={2.25} />
                    </Button>
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
