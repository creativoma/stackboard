import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
    Download,
    FileSpreadsheet,
    LayoutGrid,
    Settings as SettingsIcon,
    UserPlus,
} from 'lucide-react'
import { Button } from '@/app/_components/button'
import { AvatarStack } from '@/app/_components/avatar-stack'
import { ProgressBar } from '@/app/_components/progress-bar'
import { requireUser } from '@/lib/auth/session'
import { getMembership } from '@/lib/auth/membership'
import {
    canMutateBoardContent,
    isActiveMember,
    isBoardOwner,
} from '@/lib/domain/authorization'
import {
    getActiveColumnsWithCards,
    getBoard,
    getBoardLabels,
    getBoardMembers,
} from '@/lib/queries/board'
import { matchesFilters } from '@/lib/domain/filters'
import { dueDateToIso } from '@/lib/domain/due'
import { FilterBar } from './filter-bar'
import { BoardBoard } from './board-board'
import { BoardLive } from './board-live'
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
        priority?: string
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
                <h1 className="text-[15px] font-normal tracking-[-0.1px] mb-2">
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
                <h1 className="text-[15px] font-normal tracking-[-0.1px] mb-2">
                    {board.name} is closed
                </h1>
                <p className="text-[var(--color-smoke)]">
                    This board was permanently closed and can no longer be
                    edited.
                </p>
                <Button href="/boards" variant="ghost" className="mt-3">
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

    // Flattened once so every avatar on the page carries the same tooltip
    // context (role, joined date) without re-mapping at each call site.
    const people = members.map((m) => ({
        ...m.user,
        role: m.role,
        joinedAt: m.joinedAt,
    }))

    const filters = {
        member: sp.member,
        label: sp.label,
        priority: sp.priority,
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
                dueDate: dueDateToIso(c.dueDate),
                priority: c.priority,
                position: c.position,
                labelIds: c.labelIds,
                checklist: c.checklist,
            }))
    }

    const canManage = isBoardOwner(membership)
    const canEdit = canMutateBoardContent(membership)

    return (
        <div className="relative flex flex-col gap-4 h-full">
            <BoardLive boardId={boardId} />
            <div className="relative flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                    <span
                        className="w-9 h-9 rounded-[var(--radius-inputs)] flex items-center justify-center shrink-0 bg-[var(--color-electric-blue-tint)] text-[var(--color-electric-blue)]"
                        aria-hidden="true"
                    >
                        <LayoutGrid size={18} strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-[16px] font-medium tracking-[-0.2px] text-[var(--color-ink)] truncate">
                            {board.name}
                        </h1>
                        <p className="tabular text-[13px] text-[var(--color-smoke)] mb-1.5">
                            {columns.length} column
                            {columns.length === 1 ? '' : 's'} · {cards.length}{' '}
                            card{cards.length === 1 ? '' : 's'}
                        </p>
                        {checklistTotal > 0 ? (
                            <ProgressBar
                                value={checklistDone}
                                max={checklistTotal}
                                label={`${checklistDone} of ${checklistTotal} checklist items complete`}
                                trackClassName="bg-[var(--color-sunken)]"
                                className="w-56 max-w-full"
                            />
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <AvatarStack people={people} onBoard boardId={boardId} />
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
                        aria-label="Export board as JSON"
                        title="Export board as JSON"
                    >
                        <Download size={15} strokeWidth={2.25} />
                    </Button>
                    <Button
                        href={`/boards/${boardId}/export?format=csv`}
                        external
                        variant="onBoard"
                        aria-label="Export board as CSV"
                        title="Export board as CSV"
                    >
                        <FileSpreadsheet size={15} strokeWidth={2.25} />
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

            <div className="relative bg-[var(--color-paper)] border border-[var(--color-mist)] rounded-[var(--radius-cards)] p-2">
                <FilterBar
                    boardId={boardId}
                    members={people}
                    labels={labels}
                    filters={{ ...sp }}
                />
            </div>

            {columns.length === 0 ? (
                <div className="bg-[var(--color-paper)] rounded-[var(--radius-cards)] text-center py-16">
                    <p className="text-[var(--color-smoke)] mb-3">
                        No active columns yet.
                    </p>
                    {canEdit ? <NewColumnForm boardId={boardId} /> : null}
                </div>
            ) : (
                <>
                    <BoardBoard
                        boardId={boardId}
                        columns={columns}
                        cardsByColumn={cardsByColumn}
                        members={people}
                        labels={labels}
                        canManage={canManage}
                        canEdit={canEdit}
                    />
                    {canEdit ? <NewColumnForm boardId={boardId} /> : null}
                </>
            )}
        </div>
    )
}

export const dynamic = 'force-dynamic'
