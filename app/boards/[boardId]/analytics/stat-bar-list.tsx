type StatRow = { label: string; count: number; color?: string }

export function StatBarList({ rows }: { rows: StatRow[] }) {
    const max = Math.max(1, ...rows.map((r) => r.count))

    return (
        <ul className="flex flex-col gap-2.5">
            {rows.map((row) => (
                <li key={row.label} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs text-[var(--color-smoke)] truncate">
                        {row.label}
                    </span>
                    <span className="flex-1 h-2 rounded-full bg-[var(--color-sunken)] overflow-hidden">
                        <span
                            className="block h-full rounded-full transition-[width] duration-200"
                            style={{
                                width: `${(row.count / max) * 100}%`,
                                background:
                                    row.color ?? 'var(--color-electric-blue)',
                            }}
                        />
                    </span>
                    <span className="tabular text-xs font-medium text-[var(--color-fog)] w-5 text-right shrink-0">
                        {row.count}
                    </span>
                </li>
            ))}
        </ul>
    )
}
