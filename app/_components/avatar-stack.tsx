type Person = { id: string; name: string }

const sizeClass = {
    sm: 'w-6 h-6 text-[11px]',
    md: 'w-7 h-7 text-[11px]',
    lg: 'w-8 h-8 text-[12px]',
} as const

export function Avatar({
    person,
    size = 'md',
    onBoard = false,
    className,
}: {
    person: Person
    size?: keyof typeof sizeClass
    onBoard?: boolean
    className?: string
}) {
    return (
        <span
            className={[
                'inline-flex items-center justify-center shrink-0 rounded-full font-semibold',
                sizeClass[size],
                onBoard
                    ? 'bg-[#1c7fc4] text-white ring-2 ring-white/70 shadow-[0_1px_3px_rgba(0,0,0,0.25)]'
                    : 'bg-[var(--color-lavender)] text-[var(--color-ink)]',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
            title={person.name}
        >
            {person.name.slice(0, 1).toUpperCase()}
        </span>
    )
}

export function AvatarStack({
    people,
    max = 5,
    size = 'md',
    onBoard = false,
    className,
}: {
    people: Person[]
    max?: number
    size?: keyof typeof sizeClass
    onBoard?: boolean
    className?: string
}) {
    if (people.length === 0) return null
    const shown = people.slice(0, max)
    const overflow = people.length - shown.length

    return (
        <div
            className={['flex items-center -space-x-2', className]
                .filter(Boolean)
                .join(' ')}
            aria-label={`${people.length} member${people.length === 1 ? '' : 's'}`}
        >
            {shown.map((person) => (
                <Avatar
                    key={person.id}
                    person={person}
                    size={size}
                    onBoard={onBoard}
                />
            ))}
            {overflow > 0 ? (
                <span
                    className={[
                        'inline-flex items-center justify-center shrink-0 rounded-full font-semibold',
                        sizeClass[size],
                        onBoard
                            ? 'bg-[#1c7fc4] text-white ring-2 ring-white/70 shadow-[0_1px_3px_rgba(0,0,0,0.25)]'
                            : 'bg-[var(--color-lavender)] text-[var(--color-ink)]',
                    ].join(' ')}
                >
                    +{overflow}
                </span>
            ) : null}
        </div>
    )
}
