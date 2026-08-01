import type { MemberSummary, LabelSummary } from './board-types'

export function FilterBar({
    boardId,
    members,
    labels,
    filters,
}: {
    boardId: string
    members: MemberSummary[]
    labels: LabelSummary[]
    filters: { member?: string; label?: string; overdue?: string; q?: string }
}) {
    return (
        <form
            method="get"
            action={`/boards/${boardId}`}
            className="flex flex-wrap items-center gap-2"
            role="search"
            aria-label="Filter cards"
        >
            <div className="relative max-w-[220px] w-full">
                <svg
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-fog)]"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                >
                    <circle
                        cx="7"
                        cy="7"
                        r="5.25"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M11 11L14 14"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                </svg>
                <input
                    type="search"
                    name="q"
                    defaultValue={filters.q ?? ''}
                    placeholder="Search cards…"
                    className="input pl-8"
                    aria-label="Keyword search"
                />
            </div>
            <select
                name="member"
                defaultValue={filters.member ?? ''}
                className="input max-w-[160px] w-auto"
                aria-label="Filter by member"
            >
                <option value="">Everyone</option>
                {members.map((m) => (
                    <option key={m.id} value={m.id}>
                        {m.name}
                    </option>
                ))}
            </select>
            <select
                name="label"
                defaultValue={filters.label ?? ''}
                className="input max-w-[160px] w-auto"
                aria-label="Filter by label"
            >
                <option value="">All labels</option>
                {labels.map((l) => (
                    <option key={l.id} value={l.id}>
                        {l.name}
                    </option>
                ))}
            </select>
            <label className="flex items-center gap-1.5 text-sm pl-1 py-1.5 px-2.5 rounded-[var(--radius-buttons)] bg-[var(--color-snow)] cursor-pointer select-none has-[:checked]:bg-[var(--color-electric-blue-tint)] has-[:checked]:text-[var(--color-electric-blue)] has-[:checked]:font-medium transition-colors">
                <input
                    type="checkbox"
                    name="overdue"
                    value="1"
                    defaultChecked={filters.overdue === '1'}
                    className="accent-[var(--color-electric-blue)]"
                />
                Overdue only
            </label>
            <button type="submit" className="btn-primary">
                Apply
            </button>
            {filters.member || filters.label || filters.overdue || filters.q ? (
                <a
                    href={`/boards/${boardId}`}
                    className="text-sm font-medium text-[var(--color-electric-blue)] hover:text-[var(--color-midnight-pressed)]"
                >
                    Clear
                </a>
            ) : null}
        </form>
    )
}
