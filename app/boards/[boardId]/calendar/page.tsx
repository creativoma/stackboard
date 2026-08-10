import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/app/_components/button'
import { requireUser } from '@/lib/auth/session'
import { getMembership } from '@/lib/auth/membership'
import { isActiveMember } from '@/lib/domain/authorization'
import { getActiveColumnsWithCards, getBoard } from '@/lib/queries/board'
import {
    dateKey,
    getMonthGridDays,
    groupCardsByDueDate,
} from '@/lib/domain/calendar'
import { MonthGrid } from './month-grid'

const MONTH_LABEL = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
})

function parseMonth(raw: string | undefined): { year: number; month: number } {
    const match = raw && /^(\d{4})-(\d{2})$/.exec(raw)
    if (match) {
        const year = Number(match[1])
        const month = Number(match[2]) - 1
        if (month >= 0 && month <= 11) return { year, month }
    }
    const now = new Date()
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() }
}

function monthParam(year: number, month: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}`
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ boardId: string }>
}): Promise<Metadata> {
    const { boardId } = await params
    const board = await getBoard(boardId)
    return { title: board ? `Calendar · ${board.name}` : 'Calendar' }
}

export default async function BoardCalendarPage({
    params,
    searchParams,
}: {
    params: Promise<{ boardId: string }>
    searchParams: Promise<{ month?: string }>
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

    const { year, month } = parseMonth(sp.month)
    const { cards } = await getActiveColumnsWithCards(boardId)

    const days = getMonthGridDays(year, month)
    const cardsByDay = groupCardsByDueDate(cards)
    const todayKey = dateKey(new Date())

    const prevMonth =
        month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    const nextMonth =
        month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }

    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            <div>
                <Button href={`/boards/${boardId}`} variant="ghost">
                    &larr; {board.name}
                </Button>
                <h1 className="text-[16px] font-medium tracking-[-0.2px] mt-1">
                    Calendar
                </h1>
                <p className="text-[var(--color-smoke)] mt-1 text-sm">
                    Active cards, plotted by due date.
                </p>
            </div>

            <div className="flex items-center justify-between gap-3">
                <Button
                    href={`/boards/${boardId}/calendar?month=${monthParam(prevMonth.year, prevMonth.month)}`}
                    variant="outline"
                    size="sm"
                    aria-label="Previous month"
                >
                    <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" />
                </Button>
                <p className="text-sm font-medium tabular">
                    {MONTH_LABEL.format(new Date(Date.UTC(year, month, 1)))}
                </p>
                <Button
                    href={`/boards/${boardId}/calendar?month=${monthParam(nextMonth.year, nextMonth.month)}`}
                    variant="outline"
                    size="sm"
                    aria-label="Next month"
                >
                    <ChevronRight
                        size={14}
                        strokeWidth={2}
                        aria-hidden="true"
                    />
                </Button>
            </div>

            <MonthGrid
                boardId={boardId}
                days={days}
                cardsByDay={cardsByDay}
                todayKey={todayKey}
            />
        </div>
    )
}

export const dynamic = 'force-dynamic'
