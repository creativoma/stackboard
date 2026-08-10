/**
 * Pure layout math for the board Gantt/timeline view. No I/O — the query
 * layer hands over cards with startDate/dueDate, and everything here is
 * plain date arithmetic producing percentages a CSS bar can use directly.
 */

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_BAR_WIDTH_PCT = 2

export type DateRange = { start: Date; end: Date }

/**
 * A card's bar bounds: startDate..dueDate when both are set, or a
 * single-day bar/milestone anchored on whichever one is set. Null when
 * neither date is set — the caller excludes the card from the chart.
 */
export function cardBarBounds(card: {
    startDate: Date | null
    dueDate: Date | null
}): DateRange | null {
    if (card.startDate && card.dueDate) {
        return card.dueDate.getTime() >= card.startDate.getTime()
            ? { start: card.startDate, end: card.dueDate }
            : { start: card.dueDate, end: card.startDate }
    }
    const single = card.startDate ?? card.dueDate
    return single ? { start: single, end: single } : null
}

/**
 * The chart's overall date range: spans every bar plus today, padded a few
 * days on each side. Falls back to a window around today when there are no
 * dated cards at all.
 */
export function deriveDateRange(
    bounds: readonly DateRange[],
    today: Date,
    paddingDays = 2
): DateRange {
    const starts = bounds.map((b) => b.start.getTime())
    const ends = bounds.map((b) => b.end.getTime())
    const minTime = Math.min(
        today.getTime(),
        ...(starts.length ? starts : [today.getTime()])
    )
    const maxTime = Math.max(
        today.getTime(),
        ...(ends.length ? ends : [today.getTime()])
    )
    return {
        start: new Date(minTime - paddingDays * DAY_MS),
        end: new Date(maxTime + paddingDays * DAY_MS),
    }
}

/** A bar's horizontal position/width within `range`, as percentages. */
export function barLayout(
    range: DateRange,
    bar: DateRange
): {
    offsetPct: number
    widthPct: number
} {
    const totalMs = range.end.getTime() - range.start.getTime()
    if (totalMs <= 0) return { offsetPct: 0, widthPct: 100 }

    const clampedStart = Math.max(bar.start.getTime(), range.start.getTime())
    const clampedEnd = Math.min(bar.end.getTime(), range.end.getTime())
    const offsetPct = ((clampedStart - range.start.getTime()) / totalMs) * 100
    const widthPct = Math.max(
        ((clampedEnd - clampedStart) / totalMs) * 100,
        MIN_BAR_WIDTH_PCT
    )
    return { offsetPct: Math.min(offsetPct, 100 - MIN_BAR_WIDTH_PCT), widthPct }
}

/** Where "today" falls within `range`, as a percentage — for a marker line. */
export function todayOffsetPct(range: DateRange, today: Date): number {
    const totalMs = range.end.getTime() - range.start.getTime()
    if (totalMs <= 0) return 0
    const pct = ((today.getTime() - range.start.getTime()) / totalMs) * 100
    return Math.min(100, Math.max(0, pct))
}
