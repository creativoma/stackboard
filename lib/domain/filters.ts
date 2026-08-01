export type FilterableCard = {
    title: string
    description: string
    assigneeId: string | null
    dueDate: Date | null
    labelIds: string[]
}

export type BoardFilters = {
    member?: string
    label?: string
    overdue?: boolean
    q?: string
}

export function isOverdue(
    dueDate: Date | null,
    now: Date = new Date()
): boolean {
    return !!dueDate && dueDate.getTime() < now.getTime()
}

export function matchesFilters<T extends FilterableCard>(
    card: T,
    filters: BoardFilters,
    now: Date = new Date()
): boolean {
    if (filters.member && card.assigneeId !== filters.member) return false
    if (filters.label && !card.labelIds.includes(filters.label)) return false
    if (filters.overdue && !isOverdue(card.dueDate, now)) return false
    if (filters.q) {
        const q = filters.q.trim().toLowerCase()
        if (
            q &&
            !card.title.toLowerCase().includes(q) &&
            !card.description.toLowerCase().includes(q)
        )
            return false
    }
    return true
}
