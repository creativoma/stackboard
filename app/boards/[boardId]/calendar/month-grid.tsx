import Link from 'next/link'
import { dateKey, type MonthGridDay } from '@/lib/domain/calendar'
import { priorityMeta } from '@/lib/priority'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type CalendarCard = {
    id: string
    title: string
    priority: string | null
}

const MAX_VISIBLE_PER_DAY = 3

export function MonthGrid({
    boardId,
    days,
    cardsByDay,
    todayKey,
}: {
    boardId: string
    days: MonthGridDay[]
    cardsByDay: Map<string, CalendarCard[]>
    todayKey: string
}) {
    return (
        <div className="bg-[var(--color-paper)] border border-[var(--color-mist)] rounded-[var(--radius-largecards)] overflow-hidden">
            <div className="grid grid-cols-7 border-b border-[var(--color-mist)] bg-[var(--color-snow)]">
                {WEEKDAY_LABELS.map((label) => (
                    <div
                        key={label}
                        className="eyebrow text-center py-2"
                        aria-hidden="true"
                    >
                        {label}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {days.map(({ date, inMonth }) => {
                    const key = dateKey(date)
                    const cards = cardsByDay.get(key) ?? []
                    const visible = cards.slice(0, MAX_VISIBLE_PER_DAY)
                    const overflow = cards.length - visible.length
                    const isToday = key === todayKey

                    return (
                        <div
                            key={key}
                            className={`min-h-24 p-1.5 border-b border-r border-[var(--color-mist)] [&:nth-child(7n)]:border-r-0 flex flex-col gap-1 ${
                                inMonth
                                    ? ''
                                    : 'bg-[var(--color-snow)] opacity-60'
                            }`}
                        >
                            <span
                                className={`tabular text-xs w-5 h-5 flex items-center justify-center rounded-full ${
                                    isToday
                                        ? 'bg-[var(--color-electric-blue)] text-white font-medium'
                                        : 'text-[var(--color-fog)]'
                                }`}
                            >
                                {date.getUTCDate()}
                            </span>
                            <ul className="flex flex-col gap-0.5">
                                {visible.map((card) => {
                                    const meta = priorityMeta(card.priority)
                                    return (
                                        <li key={card.id} className="min-w-0">
                                            <Link
                                                href={`/boards/${boardId}/cards/${card.id}`}
                                                title={card.title}
                                                className="flex items-center gap-1 text-[11px] leading-tight text-[var(--color-ink-secondary)] hover:text-[var(--color-electric-blue)] transition-colors"
                                            >
                                                <span
                                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                                    style={{
                                                        background:
                                                            meta?.color ??
                                                            'var(--color-fog)',
                                                    }}
                                                    aria-hidden="true"
                                                />
                                                <span className="truncate">
                                                    {card.title}
                                                </span>
                                            </Link>
                                        </li>
                                    )
                                })}
                                {overflow > 0 ? (
                                    <li className="text-[11px] text-[var(--color-fog)] pl-2.5">
                                        +{overflow} more
                                    </li>
                                ) : null}
                            </ul>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
