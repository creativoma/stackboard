import Link from 'next/link'
import { formatDate } from '@/lib/format'

type Person = {
    id: string
    name: string
    // Optional context shown in the hover tooltip. Only ever populated from a
    // board the viewer is an active member of, so this never crosses the
    // tenant boundary.
    email?: string
    role?: string
    joinedAt?: Date | string
}

const sizeClass = {
    sm: 'w-6 h-6 text-[11px]',
    md: 'w-7 h-7 text-[11px]',
    lg: 'w-8 h-8 text-[12px]',
} as const

const baseClass =
    'inline-flex items-center justify-center shrink-0 rounded-full font-semibold'

function skinClass(onBoard: boolean) {
    return onBoard
        ? 'bg-[var(--color-midnight)] text-white ring-2 ring-[var(--color-paper)]'
        : 'bg-[var(--color-avatar-muted)] text-[var(--color-avatar-muted-ink)] ring-2 ring-[var(--color-paper)]'
}

// Native `title` renders each line separately, so the tooltip doubles as the
// "who is this" card without needing a popover.
function describe(person: Person) {
    const lines = [person.name]
    if (person.email) lines.push(person.email)
    if (person.role) lines.push(`Role: ${person.role}`)
    if (person.joinedAt)
        lines.push(`Member since ${formatDate(person.joinedAt)}`)
    return lines.join('\n')
}

export function Avatar({
    person,
    size = 'md',
    onBoard = false,
    boardId,
    className,
}: {
    person: Person
    size?: keyof typeof sizeClass
    onBoard?: boolean
    /**
     * When set, the avatar becomes a link that filters the board down to this
     * person's cards. Omit it inside anchors (the board cards on /boards) —
     * nested links are invalid HTML.
     */
    boardId?: string
    className?: string
}) {
    const classes = [baseClass, sizeClass[size], skinClass(onBoard), className]
        .filter(Boolean)
        .join(' ')
    const initial = person.name.slice(0, 1).toUpperCase()

    if (!boardId) {
        return (
            <span className={classes} title={describe(person)}>
                {initial}
            </span>
        )
    }

    return (
        <Link
            href={`/boards/${boardId}?member=${person.id}`}
            title={describe(person)}
            aria-label={`Show cards assigned to ${person.name}`}
            className={`${classes} hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-electric-blue)] transition-[filter] duration-150`}
        >
            {initial}
        </Link>
    )
}

export function AvatarStack({
    people,
    max = 5,
    size = 'md',
    onBoard = false,
    boardId,
    className,
}: {
    people: Person[]
    max?: number
    size?: keyof typeof sizeClass
    onBoard?: boolean
    boardId?: string
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
                    boardId={boardId}
                />
            ))}
            {overflow > 0 ? (
                <span
                    className={[
                        baseClass,
                        sizeClass[size],
                        skinClass(onBoard),
                    ].join(' ')}
                    title={people
                        .slice(max)
                        .map((p) => p.name)
                        .join('\n')}
                >
                    +{overflow}
                </span>
            ) : null}
        </div>
    )
}
