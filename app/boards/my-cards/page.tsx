import type { Metadata } from 'next'
import Link from 'next/link'
import { Calendar, ChevronRight } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { listMyCards } from '@/lib/queries/my-cards'
import {
    bucketByDue,
    dueDateToIso,
    isValidDueDate,
    DUE_BUCKETS,
    type DueBucket,
} from '@/lib/domain/due'
import { formatDate } from '@/lib/format'

export const metadata: Metadata = { title: 'My cards' }

const BUCKET_LABELS: Record<DueBucket, string> = {
    overdue: 'Overdue',
    today: 'Due today',
    thisWeek: 'Due this week',
    later: 'Later',
    noDate: 'No due date',
}

// Urgency reads left to right: a colored dot per bucket, hottest first.
const BUCKET_DOTS: Record<DueBucket, string> = {
    overdue: 'var(--color-coral)',
    today: 'var(--color-electric-blue)',
    thisWeek: 'var(--color-primary-soft)',
    later: 'var(--color-fog)',
    noDate: 'var(--color-concrete)',
}

export default async function MyCardsPage() {
    const user = await requireUser()
    const cards = await listMyCards(user.id)
    const buckets = bucketByDue(cards)

    return (
        <div className="flex flex-col gap-5 max-w-3xl">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <h1 className="text-[16px] font-medium tracking-[-0.2px]">
                    My cards
                </h1>
                <p className="tabular text-[13px] text-[var(--color-smoke)]">
                    {cards.length} card{cards.length === 1 ? '' : 's'} across
                    your boards
                </p>
            </div>

            {cards.length === 0 ? (
                <div className="card-surface text-center py-10">
                    <p className="text-[var(--color-smoke)]">
                        Nothing assigned to you right now.
                    </p>
                </div>
            ) : (
                <div className="bg-[var(--color-paper)] border border-[var(--color-mist)] rounded-[var(--radius-largecards)] overflow-hidden">
                    {DUE_BUCKETS.map((bucket) =>
                        buckets[bucket].length === 0 ? null : (
                            <section
                                key={bucket}
                                aria-labelledby={`bucket-${bucket}`}
                            >
                                <header className="flex items-center gap-2 px-4 py-1.5 bg-[var(--color-snow)] border-y border-[var(--color-mist)] first:border-t-0">
                                    <span
                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                        style={{
                                            background: BUCKET_DOTS[bucket],
                                        }}
                                        aria-hidden="true"
                                    />
                                    <h2
                                        id={`bucket-${bucket}`}
                                        className={`eyebrow ${
                                            bucket === 'overdue'
                                                ? 'text-[var(--color-coral)]'
                                                : ''
                                        }`}
                                    >
                                        {BUCKET_LABELS[bucket]}
                                    </h2>
                                    <span className="tabular text-[10px] font-medium text-[var(--color-fog)] bg-[var(--color-sunken)] rounded-[var(--radius-tags)] min-w-[18px] h-[16px] px-1 inline-flex items-center justify-center">
                                        {buckets[bucket].length}
                                    </span>
                                </header>
                                <ul className="divide-y divide-[var(--color-mist)]">
                                    {buckets[bucket].map((card) => (
                                        <li key={card.cardId}>
                                            <Link
                                                href={`/boards/${card.boardId}/cards/${card.cardId}`}
                                                className="group flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-snow)] transition-colors"
                                            >
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-medium text-[var(--color-ink)] group-hover:text-[var(--color-electric-blue)] transition-colors truncate">
                                                        {card.title}
                                                    </span>
                                                    <span className="block text-xs text-[var(--color-fog)] truncate">
                                                        {card.boardName}
                                                    </span>
                                                </span>
                                                <span className="pill bg-[var(--color-sunken)] text-[var(--color-smoke)] shrink-0 hidden sm:inline-flex">
                                                    {card.columnName}
                                                </span>
                                                {isValidDueDate(
                                                    card.dueDate
                                                ) ? (
                                                    <span
                                                        className={`tabular shrink-0 inline-flex items-center gap-1 text-xs ${
                                                            bucket === 'overdue'
                                                                ? 'pill bg-[var(--color-blush)] text-[var(--color-coral)] font-semibold'
                                                                : 'text-[var(--color-fog)]'
                                                        }`}
                                                    >
                                                        <Calendar
                                                            size={12}
                                                            strokeWidth={2}
                                                            aria-hidden="true"
                                                        />
                                                        {formatDate(
                                                            dueDateToIso(
                                                                card.dueDate
                                                            ) ?? ''
                                                        )}
                                                    </span>
                                                ) : null}
                                                <ChevronRight
                                                    size={14}
                                                    strokeWidth={2}
                                                    className="shrink-0 text-[var(--color-concrete)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-[opacity,transform] duration-150"
                                                    aria-hidden="true"
                                                />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )
                    )}
                </div>
            )}
        </div>
    )
}

export const dynamic = 'force-dynamic'
