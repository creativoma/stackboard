import { REPO_URL } from '../repo'
import { BoardPreview } from './BoardPreview'
import { GithubIcon } from './GithubIcon'

export function Hero() {
    return (
        <section
            id="top"
            className="relative overflow-hidden max-w-6xl mx-auto px-6 pt-14 pb-20"
        >
            <div className="bp-grid absolute inset-x-0 top-0 h-[620px] -z-10" />
            <span className="bp-crosshair hidden sm:block left-0 top-6" />
            <span className="bp-crosshair hidden sm:block right-0 top-6" />

            <div
                className="hidden sm:flex items-center justify-between reveal-onload text-[11px] font-mono tracking-wide text-fog"
                style={{ animationDelay: '0ms' }}
            >
                <span>STACKBOARD / BLUEPRINT</span>
                <span>SELF-HOSTED — MIT</span>
            </div>

            <div className="mt-10 max-w-3xl">
                <span
                    className="eyebrow block reveal-onload"
                    style={{ animationDelay: '40ms' }}
                >
                    Open source · MIT licensed
                </span>
                <h1
                    className="mt-4 font-display text-5xl sm:text-6xl lg:text-[68px] leading-[1.04] tracking-tight text-ink text-balance reveal-onload"
                    style={{ animationDelay: '110ms' }}
                >
                    A focused, shared board
                    <br />
                    for{' '}
                    <em className="font-normal italic text-electric-blue">
                        one team&apos;s
                    </em>{' '}
                    work.
                </h1>
                <p
                    className="mt-5 max-w-xl text-base sm:text-lg text-smoke text-balance reveal-onload"
                    style={{ animationDelay: '180ms' }}
                >
                    Stackboard is a self-hostable, Trello-style kanban board:
                    realtime sync, mentions, WIP limits, priorities, and
                    attachments — built with Next.js, Postgres, and Drizzle.
                    Clone it, read the code, run it yourself.
                </p>
                <div
                    className="mt-8 flex flex-wrap items-center gap-3 reveal-onload"
                    style={{ animationDelay: '250ms' }}
                >
                    <a
                        href={REPO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                    >
                        <GithubIcon />
                        View on GitHub
                    </a>
                    <a
                        href={`${REPO_URL}#readme`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline"
                    >
                        Read the docs
                    </a>
                </div>
            </div>

            <div
                className="mt-16 reveal-onload"
                style={{ animationDelay: '320ms' }}
            >
                <div className="flex items-center gap-3 mb-3">
                    <span className="spec-index shrink-0">
                        FIG. 01 — LIVE PREVIEW
                    </span>
                    <span className="dimension-line flex-1" />
                </div>
                <BoardPreview />
            </div>
        </section>
    )
}
