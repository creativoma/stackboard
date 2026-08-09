import type { CardPriority } from '@/db/schema'

// Priority is urgency — a functional state, like error/success — so its
// colors sit outside the blue-only decorative rule by design (DESIGN.md):
// hot levels burn red/orange, calm levels cool back into the brand blues.
export const PRIORITIES: {
    value: CardPriority
    label: string
    color: string
}[] = [
    { value: 'highest', label: 'Highest', color: '#dc2626' },
    { value: 'high', label: 'High', color: '#ea580c' },
    { value: 'medium', label: 'Medium', color: '#d97706' },
    { value: 'low', label: 'Low', color: '#1868db' },
    { value: 'lowest', label: 'Lowest', color: '#4c8fe8' },
]

export function priorityMeta(value: string | null | undefined) {
    if (!value) return null
    return PRIORITIES.find((p) => p.value === value) ?? null
}
