import { Reveal } from './Reveal'

const STACK = [
    { role: 'Framework', value: 'Next.js' },
    { role: 'UI', value: 'React + TypeScript' },
    { role: 'Database', value: 'Postgres' },
    { role: 'ORM', value: 'Drizzle ORM' },
    { role: 'Styling', value: 'Tailwind CSS' },
    { role: 'Runtime', value: 'Bun' },
]

export function Stack() {
    return (
        <section id="stack" className="max-w-6xl mx-auto px-6 py-24">
            <Reveal>
                <div className="flex items-end justify-between gap-6">
                    <span className="eyebrow">Tech stack</span>
                    <span className="spec-index hidden sm:block shrink-0">
                        03 / 03
                    </span>
                </div>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl font-medium tracking-tight text-ink">
                    Boring, well-documented tools.
                </h2>
            </Reveal>
            <div className="mt-10 grid lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16">
                <Reveal className="max-w-md">
                    <p className="text-sm text-smoke leading-relaxed">
                        Next.js App Router with Server Components and Server
                        Actions as the only write path, Postgres via Drizzle
                        ORM, and Bun as the runner. See the repo&apos;s{' '}
                        <code className="text-xs bg-sunken px-1.5 py-0.5 rounded-tags">
                            README.md
                        </code>{' '}
                        for setup and{' '}
                        <code className="text-xs bg-sunken px-1.5 py-0.5 rounded-tags">
                            AGENTS.md
                        </code>{' '}
                        for how the codebase is organized.
                    </p>
                </Reveal>
                <div className="elevated-surface rounded-largecards divide-y divide-mist overflow-hidden">
                    {STACK.map(({ role, value }, i) => (
                        <Reveal
                            key={role}
                            delay={i * 45}
                            className="group flex items-center gap-4 px-4 sm:px-5 py-3 border-l-2 border-transparent hover:border-electric-blue hover:bg-electric-blue-tint/40 transition-colors duration-150"
                        >
                            <span className="spec-index w-6 shrink-0">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="font-mono text-[11px] uppercase tracking-wide text-fog w-24 shrink-0">
                                {role}
                            </span>
                            <span className="text-sm font-medium text-ink group-hover:text-electric-blue transition-colors duration-150">
                                {value}
                            </span>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    )
}
