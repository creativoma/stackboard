import {
    Radio,
    AtSign,
    Gauge,
    Search,
    LayoutTemplate,
    Paperclip,
} from 'lucide-react'
import { Reveal } from './Reveal'

const FEATURES = [
    {
        icon: Radio,
        title: 'Realtime sync',
        description:
            'Board activity pushes live over SSE — no polling, no stale columns.',
    },
    {
        icon: AtSign,
        title: 'Mentions & watchers',
        description:
            '@mention teammates in comments and get notified on cards you watch.',
    },
    {
        icon: Gauge,
        title: 'WIP limits & priority',
        description:
            'Cap work-in-progress per column and flag urgency with Jira-style priority chevrons.',
    },
    {
        icon: Search,
        title: 'Search',
        description:
            'Find any card, board, or comment without leaving the keyboard.',
    },
    {
        icon: LayoutTemplate,
        title: 'Board templates',
        description:
            'Start new boards from a template instead of an empty column.',
    },
    {
        icon: Paperclip,
        title: 'Attachments',
        description:
            'Attach files to cards, backed by a pluggable object storage adapter.',
    },
]

export function Features() {
    return (
        <section id="features" className="max-w-6xl mx-auto px-6 py-24">
            <Reveal className="flex items-end justify-between gap-6 max-w-3xl">
                <div>
                    <span className="eyebrow">Features</span>
                    <h2 className="mt-3 font-display text-3xl sm:text-4xl font-medium tracking-tight text-ink">
                        Everything a small team needs,
                        <br className="hidden sm:block" /> nothing it
                        doesn&apos;t.
                    </h2>
                </div>
                <span className="spec-index hidden sm:block shrink-0 pb-1">
                    01 / 03
                </span>
            </Reveal>
            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {FEATURES.map(({ icon: Icon, title, description }, i) => (
                    <Reveal
                        key={title}
                        delay={i * 70}
                        className="relative card-surface rounded-largecards group hover:border-electric-blue hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
                    >
                        <span className="spec-index absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-inputs bg-electric-blue-tint text-electric-blue transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
                            <Icon size={18} aria-hidden="true" />
                        </span>
                        <h3 className="mt-4 text-sm font-medium text-ink">
                            {title}
                        </h3>
                        <p className="mt-1.5 text-sm text-smoke">
                            {description}
                        </p>
                    </Reveal>
                ))}
            </div>
        </section>
    )
}
