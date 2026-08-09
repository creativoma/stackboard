// Mirrors app/_components/priority-icon.tsx (Jira-new-style chevrons) so the
// board mockup below matches the real product.
const COLORS = {
    highest: '#dc2626',
    high: '#ea580c',
    medium: '#d97706',
    low: '#1868db',
} as const

const PATHS: Record<keyof typeof COLORS, React.ReactNode> = {
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
}

export function PriorityIcon({
    priority,
    size = 14,
}: {
    priority: keyof typeof COLORS
    size?: number
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            fill="none"
            stroke={COLORS[priority]}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {PATHS[priority]}
        </svg>
    )
}
