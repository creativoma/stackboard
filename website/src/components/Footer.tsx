import { REPO_URL } from '../repo'
import { GithubIcon } from './GithubIcon'

export function Footer() {
    return (
        <footer className="border-t border-mist">
            <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-fog">
                <span>
                    © {new Date().getFullYear()} Stackboard. MIT licensed.
                </span>
                <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 hover:text-ink transition-colors"
                >
                    <span className="inline-flex transition-transform duration-200 group-hover:rotate-12">
                        <GithubIcon size={14} />
                    </span>
                    creativoma/stackboard
                </a>
            </div>
        </footer>
    )
}
