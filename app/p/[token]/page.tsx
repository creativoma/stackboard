import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Eye, LayoutGrid } from 'lucide-react'
import { ProgressBar } from '@/app/_components/progress-bar'
import { PriorityIcon } from '@/app/_components/priority-icon'
import {
    getBoardByPublicToken,
    getPublicBoardView,
} from '@/lib/queries/public-board'
import { isOverdue } from '@/lib/domain/filters'
import { formatDate } from '@/lib/format'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ token: string }>
}): Promise<Metadata> {
    const { token } = await params
    const board = await getBoardByPublicToken(token)
    return {
        title: board ? `${board.name} (read-only)` : 'Board not found',
        robots: { index: false, follow: false },
    }
}

export default async function PublicBoardPage({
    params,
}: {
    params: Promise<{ token: string }>
}) {
    const { token } = await params
    const board = await getBoardByPublicToken(token)
    if (!board) notFound()

    const { columns, cards } = await getPublicBoardView(board.id)

    return (
        <main className="flex-1 px-4 py-8 md:px-8">
            <div className="max-w-6xl mx-auto flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <span
                            className="w-9 h-9 rounded-[var(--radius-inputs)] flex items-center justify-center shrink-0 bg-[var(--color-electric-blue-tint)] text-[var(--color-electric-blue)]"
                            aria-hidden="true"
                        >
                            <LayoutGrid size={18} strokeWidth={2} />
                        </span>
                        <div>
                            <h1 className="text-[16px] font-medium tracking-[-0.2px]">
                                {board.name}
                            </h1>
                            <p className="text-[13px] text-[var(--color-smoke)]">
                                {columns.length} column
                                {columns.length === 1 ? '' : 's'} ·{' '}
                                {cards.length} card
                                {cards.length === 1 ? '' : 's'}
                            </p>
                        </div>
                    </div>
                    <span className="pill bg-[var(--color-sunken)] text-[var(--color-smoke)] flex items-center gap-1.5">
                        <Eye size={12} strokeWidth={2.5} aria-hidden="true" />
                        Read-only view
                    </span>
                </div>

                {columns.length === 0 ? (
                    <div className="card-surface text-center py-16">
                        <p className="text-[var(--color-smoke)]">
                            This board has no active columns.
                        </p>
                    </div>
                ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {columns.map((column) => {
                            const columnCards = cards.filter(
                                (c) => c.columnId === column.id
                            )
                            return (
                                <div
                                    key={column.id}
                                    className="w-72 shrink-0 flex flex-col gap-2"
                                >
                                    <div className="flex items-center justify-between px-1">
                                        <h2 className="text-sm font-medium truncate">
                                            {column.name}
                                        </h2>
                                        <span className="tabular text-xs text-[var(--color-fog)]">
                                            {columnCards.length}
                                        </span>
                                    </div>
                                    <ul className="flex flex-col gap-2 bg-[var(--color-sunken)] rounded-[var(--radius-largecards)] p-2 min-h-16">
                                        {columnCards.map((card) => {
                                            const overdue = isOverdue(
                                                card.dueDate
                                            )
                                            return (
                                                <li
                                                    key={card.id}
                                                    className="elevated-surface p-3 flex flex-col gap-1.5"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-sm font-medium tracking-[-0.1px]">
                                                            {card.title}
                                                        </p>
                                                        {card.priority ? (
                                                            <PriorityIcon
                                                                priority={
                                                                    card.priority
                                                                }
                                                                size={14}
                                                                className="shrink-0 mt-0.5"
                                                            />
                                                        ) : null}
                                                    </div>
                                                    {card.checklist.total >
                                                    0 ? (
                                                        <ProgressBar
                                                            value={
                                                                card.checklist
                                                                    .done
                                                            }
                                                            max={
                                                                card.checklist
                                                                    .total
                                                            }
                                                            label={`${card.checklist.done} of ${card.checklist.total} checklist items complete`}
                                                        />
                                                    ) : null}
                                                    {card.dueDate ? (
                                                        <span
                                                            className={`tabular text-xs w-fit ${
                                                                overdue
                                                                    ? 'pill bg-[var(--color-blush)] text-[var(--color-coral)] font-semibold'
                                                                    : 'text-[var(--color-fog)]'
                                                            }`}
                                                        >
                                                            {formatDate(
                                                                card.dueDate
                                                            )}
                                                        </span>
                                                    ) : null}
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            )
                        })}
                    </div>
                )}

                <p className="text-xs text-[var(--color-fog)] text-center mt-4">
                    Shared as a read-only view. Assignees, comments, and
                    attachments aren&apos;t shown here.
                </p>
            </div>
        </main>
    )
}

export const dynamic = 'force-dynamic'
