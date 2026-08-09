type ProgressBarProps = {
    value: number
    max: number
    label?: string
    trackClassName?: string
    fillClassName?: string
    className?: string
}

export function ProgressBar({
    value,
    max,
    label,
    trackClassName,
    fillClassName,
    className,
}: ProgressBarProps) {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0

    return (
        <div
            className={['flex items-center gap-2 w-full', className]
                .filter(Boolean)
                .join(' ')}
        >
            <div
                className={[
                    'h-1.5 flex-1 rounded-full overflow-hidden bg-[var(--color-mist)]',
                    trackClassName,
                ]
                    .filter(Boolean)
                    .join(' ')}
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-label={label}
            >
                <div
                    className={[
                        'h-full bg-[var(--color-electric-blue)] transition-[width] duration-200',
                        fillClassName,
                    ]
                        .filter(Boolean)
                        .join(' ')}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="tabular text-xs font-medium text-[var(--color-fog)] shrink-0">
                {pct}%
            </span>
        </div>
    )
}
