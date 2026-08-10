import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Button } from '@/app/_components/button'
import { requireUser } from '@/lib/auth/session'
import { getMembership } from '@/lib/auth/membership'
import { isActiveMember } from '@/lib/domain/authorization'
import { getBoard } from '@/lib/queries/board'
import { getBoardGanttCards } from '@/lib/queries/gantt'
import { getBoardDependencyEdges } from '@/lib/queries/card'
import { cardBarBounds, deriveDateRange } from '@/lib/domain/gantt'
import { formatDate } from '@/lib/format'
import { GanttChart } from './gantt-chart'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ boardId: string }>
}): Promise<Metadata> {
    const { boardId } = await params
    const board = await getBoard(boardId)
    return { title: board ? `Timeline · ${board.name}` : 'Timeline' }
}

export default async function BoardGanttPage({
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

    const [{ columns, cards }, edges] = await Promise.all([
        getBoardGanttCards(boardId),
        getBoardDependencyEdges(boardId),
    ])

    const activeIds = new Set(cards.map((c) => c.id))
    const blockedCounts = new Map<string, number>()
    for (const edge of edges) {
        if (activeIds.has(edge.blockerCardId)) {
            blockedCounts.set(
                edge.blockedCardId,
                (blockedCounts.get(edge.blockedCardId) ?? 0) + 1
            )
        }
    }

    const dated = cards.filter((c) => cardBarBounds(c) !== null)
    const undatedCount = cards.length - dated.length
    const today = new Date()
    const range = deriveDateRange(
        dated.map((c) => cardBarBounds(c)!),
        today
    )

    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            <div>
                <Button href={`/boards/${boardId}`} variant="ghost">
                    &larr; {board.name}
                </Button>
                <h1 className="text-[16px] font-medium tracking-[-0.2px] mt-1">
                    Timeline
                </h1>
                <p className="text-[var(--color-smoke)] mt-1 text-sm">
                    {formatDate(range.start)} &ndash; {formatDate(range.end)}.
                    The blue line marks today; the lock icon flags a card
                    blocked by another active card.
                </p>
            </div>

            {dated.length === 0 ? (
                <div className="card-surface text-center py-16">
                    <p className="text-[var(--color-smoke)]">
                        No cards have a start or due date yet.
                    </p>
                </div>
            ) : (
                <>
                    <GanttChart
                        boardId={boardId}
                        columns={columns}
                        cards={dated}
                        range={range}
                        today={today}
                        blockedCounts={blockedCounts}
                    />
                    {undatedCount > 0 ? (
                        <p className="text-xs text-[var(--color-fog)]">
                            {undatedCount} card
                            {undatedCount === 1 ? '' : 's'} with no start or due
                            date {undatedCount === 1 ? "isn't" : "aren't"}{' '}
                            shown.
                        </p>
                    ) : null}
                </>
            )}
        </div>
    )
}

export const dynamic = 'force-dynamic'
