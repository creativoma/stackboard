import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Button } from '@/app/_components/button'
import { ProgressBar } from '@/app/_components/progress-bar'
import { requireUser } from '@/lib/auth/session'
import { getMembership } from '@/lib/auth/membership'
import { isActiveMember } from '@/lib/domain/authorization'
import {
    getActiveColumnsWithCards,
    getArchivedCards,
    getBoard,
    getBoardMembers,
} from '@/lib/queries/board'
import { isOverdue } from '@/lib/domain/filters'
import { checklistTotals, tally } from '@/lib/domain/analytics'
import { PRIORITIES } from '@/lib/priority'
import { StatBarList } from './stat-bar-list'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ boardId: string }>
}): Promise<Metadata> {
    const { boardId } = await params
    const board = await getBoard(boardId)
    return { title: board ? `Analytics · ${board.name}` : 'Analytics' }
}

export default async function BoardAnalyticsPage({
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

    const [{ columns, cards }, members, archivedCards] = await Promise.all([
        getActiveColumnsWithCards(boardId),
        getBoardMembers(boardId),
        getArchivedCards(boardId),
    ])

    const byColumn = tally(cards, (c) => c.columnId)
    const columnRows = columns.map((col) => ({
        label: col.name,
        count: byColumn.get(col.id) ?? 0,
    }))

    const byPriority = tally(cards, (c) => c.priority ?? 'none')
    const priorityRows = [
        ...PRIORITIES.map((p) => ({
            label: p.label,
            count: byPriority.get(p.value) ?? 0,
            color: p.color,
        })),
        {
            label: 'No priority',
            count: byPriority.get('none') ?? 0,
            color: 'var(--color-fog)',
        },
    ]

    const byMember = tally(cards, (c) => c.assigneeId ?? 'unassigned')
    const memberRows = [
        ...members.map((m) => ({
            label: m.user.name,
            count: byMember.get(m.user.id) ?? 0,
        })),
        { label: 'Unassigned', count: byMember.get('unassigned') ?? 0 },
    ].sort((a, b) => b.count - a.count)

    const overdueCount = cards.filter((c) => isOverdue(c.dueDate)).length
    const { total: checklistTotal, done: checklistDone } =
        checklistTotals(cards)

    return (
        <div className="flex flex-col gap-6 max-w-[720px]">
            <div>
                <Button href={`/boards/${boardId}`} variant="ghost">
                    &larr; {board.name}
                </Button>
                <h1 className="text-[16px] font-medium tracking-[-0.2px] mt-1">
                    Analytics
                </h1>
                <p className="text-[var(--color-smoke)] mt-1 text-sm">
                    Where cards are, who&apos;s carrying them, and what&apos;s
                    overdue.
                </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="card-surface">
                    <p className="eyebrow">Active cards</p>
                    <p className="tabular text-[16px] font-medium mt-1">
                        {cards.length}
                    </p>
                </div>
                <div className="card-surface">
                    <p className="eyebrow">Overdue</p>
                    <p
                        className={`tabular text-[16px] font-medium mt-1 ${
                            overdueCount > 0 ? 'text-[var(--color-coral)]' : ''
                        }`}
                    >
                        {overdueCount}
                    </p>
                </div>
                <div className="card-surface">
                    <p className="eyebrow">Archived</p>
                    <p className="tabular text-[16px] font-medium mt-1">
                        {archivedCards.length}
                    </p>
                </div>
            </div>

            {checklistTotal > 0 ? (
                <section className="card-surface">
                    <h2 className="eyebrow mb-3">Checklist progress</h2>
                    <ProgressBar
                        value={checklistDone}
                        max={checklistTotal}
                        label={`${checklistDone} of ${checklistTotal} checklist items complete`}
                        trackClassName="bg-[var(--color-sunken)]"
                    />
                </section>
            ) : null}

            {columnRows.length > 0 ? (
                <section className="card-surface">
                    <h2 className="eyebrow mb-3">Cards by column</h2>
                    <StatBarList rows={columnRows} />
                </section>
            ) : null}

            <section className="card-surface">
                <h2 className="eyebrow mb-3">Cards by priority</h2>
                <StatBarList rows={priorityRows} />
            </section>

            <section className="card-surface">
                <h2 className="eyebrow mb-3">Load per member</h2>
                <StatBarList rows={memberRows} />
            </section>
        </div>
    )
}

export const dynamic = 'force-dynamic'
