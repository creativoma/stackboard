import Link from 'next/link'
import { Lock } from 'lucide-react'
import {
    barLayout,
    cardBarBounds,
    todayOffsetPct,
    type DateRange,
} from '@/lib/domain/gantt'
import { priorityMeta } from '@/lib/priority'

type GanttCard = {
    id: string
    title: string
    columnId: string
    priority: string | null
    startDate: Date | null
    dueDate: Date | null
}

export function GanttChart({
    boardId,
    columns,
    cards,
    range,
    today,
    blockedCounts,
}: {
    boardId: string
    columns: { id: string; name: string }[]
    cards: GanttCard[]
    range: DateRange
    today: Date
    blockedCounts: Map<string, number>
}) {
    const todayPct = todayOffsetPct(range, today)

    return (
        <div className="bg-[var(--color-paper)] border border-[var(--color-mist)] rounded-[var(--radius-largecards)] overflow-hidden">
            {columns.map((column) => {
                const columnCards = cards
                    .map((c) => ({ card: c, bounds: cardBarBounds(c) }))
                    .filter(
                        (
                            entry
                        ): entry is {
                            card: GanttCard
                            bounds: DateRange
                        } =>
                            entry.card.columnId === column.id &&
                            entry.bounds !== null
                    )
                    .sort(
                        (a, b) =>
                            a.bounds.start.getTime() - b.bounds.start.getTime()
                    )

                if (columnCards.length === 0) return null

                return (
                    <div
                        key={column.id}
                        className="border-b border-[var(--color-mist)] last:border-0"
                    >
                        <div className="eyebrow px-4 py-1.5 bg-[var(--color-snow)] border-b border-[var(--color-mist)]">
                            {column.name}
                        </div>
                        <ul className="divide-y divide-[var(--color-mist)]">
                            {columnCards.map(({ card, bounds }) => {
                                const { offsetPct, widthPct } = barLayout(
                                    range,
                                    bounds
                                )
                                const meta = priorityMeta(card.priority)
                                const blocked = blockedCounts.get(card.id) ?? 0

                                return (
                                    <li
                                        key={card.id}
                                        className="grid grid-cols-[minmax(0,180px)_1fr] items-center gap-3 px-4 py-2"
                                    >
                                        <Link
                                            href={`/boards/${boardId}/cards/${card.id}`}
                                            className="flex items-center gap-1.5 min-w-0 text-sm text-[var(--color-ink)] hover:text-[var(--color-electric-blue)] transition-colors"
                                        >
                                            {blocked > 0 ? (
                                                <Lock
                                                    size={11}
                                                    strokeWidth={2.25}
                                                    className="shrink-0 text-[var(--color-fog)]"
                                                    aria-hidden="true"
                                                />
                                            ) : null}
                                            <span
                                                className="truncate"
                                                title={
                                                    blocked > 0
                                                        ? `${card.title} — blocked by ${blocked} card${blocked === 1 ? '' : 's'}`
                                                        : card.title
                                                }
                                            >
                                                {card.title}
                                            </span>
                                        </Link>
                                        <div className="relative h-6 bg-[var(--color-sunken)] rounded-[var(--radius-inputs)]">
                                            <span
                                                className="absolute top-0 bottom-0 w-px bg-[var(--color-electric-blue)] opacity-40"
                                                style={{ left: `${todayPct}%` }}
                                                aria-hidden="true"
                                            />
                                            <span
                                                className="absolute top-1 bottom-1 rounded-[var(--radius-tags)]"
                                                style={{
                                                    left: `${offsetPct}%`,
                                                    width: `${widthPct}%`,
                                                    background:
                                                        meta?.color ??
                                                        'var(--color-electric-blue)',
                                                }}
                                                title={card.title}
                                            />
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                )
            })}
        </div>
    )
}
