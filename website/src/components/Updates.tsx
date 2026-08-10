import { ArrowRight } from 'lucide-react'
import { SHIPPED, NEXT_UP } from 'virtual:updates-data'
import { REPO_URL } from '../repo'
import { Reveal } from './Reveal'

export function Updates() {
    return (
        <section id="updates" className="max-w-6xl mx-auto px-6 py-24">
            <Reveal className="flex items-end justify-between gap-6 max-w-3xl">
                <div>
                    <span className="eyebrow">Changelog &amp; roadmap</span>
                    <h2 className="mt-3 font-display text-3xl sm:text-4xl font-medium tracking-tight text-ink">
                        Actively built in the open.
                    </h2>
                </div>
                <span className="spec-index hidden sm:block shrink-0 pb-1">
                    02 / 03
                </span>
            </Reveal>
            <div className="mt-12 grid sm:grid-cols-2 gap-4">
                <Reveal className="card-surface rounded-largecards hover:border-border-strong flex flex-col">
                    <h3 className="text-sm font-medium text-ink">
                        Recently shipped
                    </h3>
                    <ul className="mt-4 space-y-2.5">
                        {SHIPPED.map((item, i) => (
                            <li
                                key={item}
                                className="flex items-start gap-2.5 text-sm text-smoke"
                            >
                                <span className="spec-index mt-0.5 shrink-0 w-4">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <span className="flex items-start gap-2">
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-success shrink-0 pulse-dot" />
                                    {item}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-6">
                        <a
                            href={`${REPO_URL}/blob/main/CHANGELOG.md`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="arrow-link border-none"
                        >
                            See full changelog
                            <ArrowRight size={14} aria-hidden="true" />
                        </a>
                    </div>
                </Reveal>
                <Reveal
                    delay={90}
                    className="card-surface rounded-largecards hover:border-border-strong flex flex-col"
                >
                    <h3 className="text-sm font-medium text-ink">
                        What&apos;s next
                    </h3>
                    <ul className="mt-4 space-y-2.5">
                        {NEXT_UP.map((item, i) => (
                            <li
                                key={item}
                                className="flex items-start gap-2.5 text-sm text-smoke"
                            >
                                <span className="spec-index mt-0.5 shrink-0 w-4">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <span className="flex items-start gap-2">
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-electric-blue shrink-0" />
                                    {item}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-6">
                        <a
                            href={`${REPO_URL}/blob/main/ROADMAP.md`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="arrow-link"
                        >
                            See full roadmap
                            <ArrowRight size={14} aria-hidden="true" />
                        </a>
                    </div>
                </Reveal>
            </div>
        </section>
    )
}
