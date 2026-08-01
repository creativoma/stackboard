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
                    className="input h-10 box-border pl-8"
                    aria-label="Keyword search"
                />
            </div>
            <div className="relative max-w-[160px] w-full">
                <select
                    name="member"
                    defaultValue={filters.member ?? ''}
                    className="input h-10 box-border appearance-none pr-8"
                    aria-label="Filter by member"
                >
                    <option value="">Everyone</option>
                    {members.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.name}
                        </option>
                    ))}
                </select>
                <svg
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-fog)]"
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        d="M1 1L5 5L9 1"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            <div className="relative max-w-[160px] w-full">
                <select
                    name="label"
                    defaultValue={filters.label ?? ''}
                    className="input h-10 box-border appearance-none pr-8"
                    aria-label="Filter by label"
                >
                    <option value="">All labels</option>
                    {labels.map((l) => (
                        <option key={l.id} value={l.id}>
                            {l.name}
                        </option>
                    ))}
                </select>
                <svg
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-fog)]"
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        d="M1 1L5 5L9 1"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            <label className="flex items-center gap-1.5 h-10 box-border text-sm px-2.5 rounded-[var(--radius-buttons)] bg-[var(--color-snow)] cursor-pointer select-none has-[:checked]:bg-[var(--color-electric-blue-tint)] has-[:checked]:text-[var(--color-electric-blue)] has-[:checked]:font-medium transition-colors">
                <input
                    type="checkbox"
                    name="overdue"
                    value="1"
                    defaultChecked={filters.overdue === '1'}
                    className="accent-[var(--color-electric-blue)]"
                />
                Overdue only
            </label>
            <button
                type="submit"
                className="btn-primary h-10 min-h-0 box-border"
            >
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
