import Link from 'next/link'
import { LayoutGrid, List } from 'lucide-react'

const VIEWS = [
    { value: 'board', label: 'Board view', icon: LayoutGrid },
    { value: 'list', label: 'List view', icon: List },
] as const

export function ViewToggle({
    boardId,
    view,
    searchParams,
}: {
    boardId: string
    view: 'board' | 'list'
    searchParams: Record<string, string | undefined>
}) {
    return (
        <div
            role="group"
            aria-label="Board display"
            className="inline-flex items-center gap-0.5 shrink-0 p-0.5 rounded-[var(--radius-inputs)] border border-[var(--color-border-strong)] bg-[var(--color-paper)]"
        >
            {VIEWS.map(({ value, label, icon: Icon }) => {
                const active = view === value
                const params = new URLSearchParams(
                    Object.entries(searchParams).filter(
                        (entry): entry is [string, string] =>
                            entry[1] !== undefined && entry[1] !== ''
                    )
                )
                if (value === 'board') {
                    params.delete('view')
                } else {
                    params.set('view', value)
                }
                const qs = params.toString()
                const href = `/boards/${boardId}${qs ? `?${qs}` : ''}`

                return (
                    <Link
                        key={value}
                        href={href}
                        aria-current={active ? 'true' : undefined}
                        aria-label={label}
                        title={label}
                        className={`flex items-center justify-center w-7 h-7 rounded-[4px] transition-colors ${
                            active
                                ? 'bg-[var(--color-electric-blue-tint)] text-[var(--color-electric-blue)]'
                                : 'text-[var(--color-smoke)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-ink)]'
                        }`}
                    >
                        <Icon size={15} strokeWidth={2.25} aria-hidden="true" />
                    </Link>
                )
            })}
        </div>
    )
}
