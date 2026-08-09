import type { CardPriority } from '@/db/schema'
import { priorityMeta } from '@/lib/priority'

// Jira-new-style chevrons: hot levels point up in reds/oranges, calm
// levels point down in blues, medium holds two level bars.
const PATHS: Record<CardPriority, React.ReactNode> = {
    highest: (
        <>
            <path d="M3.5 12.5 8 8.5l4.5 4" />
            <path d="M3.5 7.5 8 3.5l4.5 4" />
        </>
    ),
    high: <path d="M3.5 10.5 8 6l4.5 4.5" />,
    medium: (
        <>
            <path d="M3.5 5.5h9" />
            <path d="M3.5 10.5h9" />
        </>
    ),
    low: <path d="M3.5 5.5 8 10l4.5-4.5" />,
    lowest: (
        <>
            <path d="M3.5 3.5 8 7.5l4.5-4" />
            <path d="M3.5 8.5 8 12.5l4.5-4" />
        </>
    ),
}

export function PriorityIcon({
    priority,
    size = 14,
    className,
}: {
    priority: string | null | undefined
    size?: number
    className?: string
}) {
    const meta = priorityMeta(priority)
    if (!meta) return null
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            fill="none"
            stroke={meta.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            role="img"
            aria-label={`Priority: ${meta.label}`}
        >
            <title>{`Priority: ${meta.label}`}</title>
            {PATHS[meta.value]}
        </svg>
    )
}
