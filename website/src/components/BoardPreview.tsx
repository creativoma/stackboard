import { useRef, useState, type MouseEvent } from 'react'
import { PriorityIcon } from './PriorityIcon'

type PreviewCard = {
    title: string
    label?: 'blue' | 'green' | 'purple' | 'orange'
    priority?: 'highest' | 'high' | 'medium' | 'low'
    initials: string
}

type PreviewColumn = {
    name: string
    accentClass: string
    cards: PreviewCard[]
}

const COLUMNS: PreviewColumn[] = [
    {
        name: 'To do',
        accentClass: 'bg-fog',
        cards: [
            {
                title: 'Draft attachment migration plan',
                label: 'blue',
                priority: 'medium',
                initials: 'MA',
            },
            {
                title: 'Write S3 storage adapter',
                label: 'purple',
                priority: 'high',
                initials: 'JD',
            },
        ],
    },
    {
        name: 'In progress',
        accentClass: 'bg-electric-blue',
        cards: [
            {
                title: 'Realtime board sync via SSE',
                label: 'green',
                priority: 'highest',
                initials: 'MA',
            },
        ],
    },
    {
        name: 'Done',
        accentClass: 'bg-success',
        cards: [
            { title: 'Ship WIP limits', label: 'orange', initials: 'JD' },
            { title: 'Card templates', initials: 'MA' },
        ],
    },
]

const LABEL_DOT_CLASS: Record<NonNullable<PreviewCard['label']>, string> = {
    blue: 'bg-label-blue',
    green: 'bg-label-green',
    purple: 'bg-label-purple',
    orange: 'bg-label-orange',
}

export function BoardPreview() {
    const ref = useRef<HTMLDivElement>(null)
    const [tilt, setTilt] = useState({ x: 0, y: 0 })

    const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
        const bounds = ref.current?.getBoundingClientRect()
        if (!bounds) return
        const px = (event.clientX - bounds.left) / bounds.width - 0.5
        const py = (event.clientY - bounds.top) / bounds.height - 0.5
        setTilt({ x: py * -3, y: px * 3 })
    }

    return (
        <div
            ref={ref}
            className="elevated-surface rounded-largecards p-3 sm:p-4 transition-transform duration-200 ease-out will-change-transform"
            style={{
                transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTilt({ x: 0, y: 0 })}
            aria-hidden="true"
        >
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-coral" />
                    <span className="w-2 h-2 rounded-full bg-label-yellow" />
                    <span className="w-2 h-2 rounded-full bg-success" />
                </div>
                <span className="flex items-center gap-1.5 text-xs text-fog">
                    <span className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" />
                    Product Roadmap
                </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
                {COLUMNS.map((column) => (
                    <div
                        key={column.name}
                        className="bg-sunken rounded-cards p-2 flex flex-col gap-2"
                    >
                        <div className="flex items-center gap-1.5 px-1 pt-0.5">
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${column.accentClass}`}
                            />
                            <span className="text-xs font-medium text-ink-secondary">
                                {column.name}
                            </span>
                            <span className="ml-auto text-[10px] text-fog">
                                {column.cards.length}
                            </span>
                        </div>
                        {column.cards.map((card) => (
                            <div
                                key={card.title}
                                className="card-surface !p-2 rounded-cards flex flex-col gap-2 hover:border-electric-blue hover:-translate-y-0.5"
                            >
                                {card.label ? (
                                    <span
                                        className={`inline-block w-2 h-2 rounded-full ${LABEL_DOT_CLASS[card.label]}`}
                                    />
                                ) : null}
                                <p className="text-xs font-medium text-ink leading-snug">
                                    {card.title}
                                </p>
                                <div className="flex items-center justify-between">
                                    {card.priority ? (
                                        <PriorityIcon
                                            priority={card.priority}
                                        />
                                    ) : (
                                        <span />
                                    )}
                                    <span className="w-5 h-5 rounded-full bg-electric-blue-tint text-electric-blue text-[9px] font-semibold flex items-center justify-center">
                                        {card.initials}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}
