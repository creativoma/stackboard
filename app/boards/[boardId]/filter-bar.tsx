import { ChevronDown, Search } from 'lucide-react'
import type { MemberSummary, LabelSummary } from './board-types'
import { Button } from '../../_components/button'
import { PRIORITIES } from '@/lib/priority'

export function FilterBar({
    boardId,
    members,
    labels,
    filters,
}: {
    boardId: string
    members: MemberSummary[]
    labels: LabelSummary[]
    filters: {
        member?: string
        label?: string
        priority?: string
        overdue?: string
        q?: string
    }
}) {
    return (
        <form
            method="get"
            action={`/boards/${boardId}`}
            className="flex flex-wrap items-center gap-2"
            role="search"
            aria-label="Filter cards"
        >
            <div className="relative max-w-55 w-full">
                <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fog"
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                />
                <input
                    type="search"
                    name="q"
                    defaultValue={filters.q ?? ''}
                    placeholder="Search cards…"
                    className="input input--icon-left"
                    aria-label="Keyword search"
                />
            </div>
            <div className="relative max-w-40 w-full">
                <select
                    name="member"
                    defaultValue={filters.member ?? ''}
                    className="input appearance-none pr-8"
                    aria-label="Filter by member"
                >
                    <option value="">Everyone</option>
                    {members.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.name}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fog"
                    size={14}
                    strokeWidth={2}
                    aria-hidden="true"
                />
            </div>
            <div className="relative max-w-[160px] w-full">
                <select
                    name="label"
                    defaultValue={filters.label ?? ''}
                    className="input appearance-none pr-8"
                    aria-label="Filter by label"
                >
                    <option value="">All labels</option>
                    {labels.map((l) => (
                        <option key={l.id} value={l.id}>
                            {l.name}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-fog)]"
                    size={14}
                    strokeWidth={2}
                    aria-hidden="true"
                />
            </div>
            <div className="relative max-w-[150px] w-full">
                <select
                    name="priority"
                    defaultValue={filters.priority ?? ''}
                    className="input appearance-none pr-8"
                    aria-label="Filter by priority"
                >
                    <option value="">Any priority</option>
                    {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                            {p.label}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fog"
                    size={14}
                    strokeWidth={2}
                    aria-hidden="true"
                />
            </div>
            <label className="flex items-center gap-1.5 h-9 box-border text-[13px] px-3 rounded-[var(--radius-inputs)] border border-[var(--color-border-strong)] bg-[var(--color-paper)] cursor-pointer select-none has-[:checked]:bg-[var(--color-electric-blue-tint)] has-[:checked]:border-[var(--color-electric-blue)] has-[:checked]:text-[var(--color-electric-blue)] transition-colors">
                <input
                    type="checkbox"
                    name="overdue"
                    value="1"
                    defaultChecked={filters.overdue === '1'}
                    className="accent-[var(--color-electric-blue)]"
                />
                Overdue only
            </label>
            <Button type="submit" variant="primary">
                Apply
            </Button>
            {filters.member ||
            filters.label ||
            filters.priority ||
            filters.overdue ||
            filters.q ? (
                <Button variant="ghost" href={`/boards/${boardId}`}>
                    Clear
                </Button>
            ) : null}
        </form>
    )
}
