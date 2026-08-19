import { useEffect, useState } from 'react'
import { REPO_URL } from '../repo'
import { GithubIcon } from './GithubIcon'

export function Nav() {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const onScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } =
                document.documentElement
            const max = scrollHeight - clientHeight
            setProgress(max > 0 ? Math.min(1, scrollTop / max) : 0)
        }
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <header className="sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-mist">
            <div
                className="h-px bg-electric-blue origin-left transition-transform duration-150 ease-out"
                style={{ transform: `scaleX(${progress})` }}
                aria-hidden="true"
            />
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 h-14">
                <a
                    href="#top"
                    className="flex items-center transition-transform duration-150 hover:scale-[1.03]"
                >
                    <img
                        src="/logos/logo-color.svg"
                        alt="Stackboard"
                        className="h-5 w-auto dark:hidden"
                    />
                    {/* logo-color-dark.svg keeps the blue mark and whitens
                        only the wordmark — logo-white.svg is named for a
                        white *background* (its ink is all black) and
                        disappears on the dark paper. Same fix as the app
                        (app/boards/layout.tsx). */}
                    <img
                        src="/logos/logo-color-dark.svg"
                        alt="Stackboard"
                        className="h-5 w-auto hidden dark:block"
                    />
                </a>
                <nav
                    aria-label="Main"
                    className="hidden sm:flex items-center gap-1"
                >
                    <a href="#features" className="btn-ghost">
                        Features
                    </a>
                    <a href="#updates" className="btn-ghost">
                        Changelog &amp; roadmap
                    </a>
                    <a href="#stack" className="btn-ghost">
                        Tech stack
                    </a>
                </nav>
                <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                >
                    <GithubIcon />
                    View on GitHub
                </a>
            </div>
        </header>
    )
}
