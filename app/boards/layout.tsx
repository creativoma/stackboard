import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth/session'
import { countUnreadNotifications } from '@/lib/queries/notifications'
import packageJson from '@/package.json'
import { REPO_URL } from '@/lib/repo'
import { NavLinks } from './nav-links'
import { UserMenu } from './user-menu'
import { HeaderActions } from './header-actions'
import { NotificationsLive } from './notifications-live'
import { GithubIcon } from '@/app/_components/github-icon'

/** Hairline separator between footer items — the depth cue everywhere else. */
function FooterDivider() {
    return <span aria-hidden="true" className="h-3 w-px bg-mist" />
}

export const metadata: Metadata = {
    robots: { index: false, follow: false },
}

export default async function BoardsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getCurrentUser()
    if (!user) redirect('/login')
    const unreadCount = await countUnreadNotifications(user.id)

    return (
        <NotificationsLive initialUnread={unreadCount}>
            <div className="h-screen flex bg-snow">
                <aside className="hidden md:block w-60 shrink-0 h-screen sticky top-0 bg-paper border-r border-mist py-4">
                    <Link
                        href="/boards"
                        className="flex items-center px-4 mb-6"
                    >
                        {/* next/image doesn't optimize SVG (it needs
                            dangerouslyAllowSVG), so a plain img is correct
                            for the logo. Two images, toggled in globals.css
                            (.logo-light/.logo-dark) — logo-color.svg's
                            wordmark is solid black and disappears on the
                            dark-mode paper background, so the dark variant
                            keeps the blue mark and whitens only the text. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/logos/logo-color.svg"
                            alt="Stackboard"
                            className="logo-light h-5 w-auto"
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/logos/logo-color-dark.svg"
                            alt="Stackboard"
                            className="logo-dark h-5 w-auto"
                        />
                    </Link>
                    <NavLinks />
                </aside>

                <div className="flex-1 min-w-0 flex flex-col h-screen">
                    <header className="sticky top-0 z-10 shrink-0 bg-paper border-b border-mist">
                        <div className="w-full flex items-center justify-end gap-1 px-6 h-14">
                            <HeaderActions />
                            <UserMenu name={user.name} email={user.email} />
                        </div>
                    </header>

                    <main className="flex-1 min-h-0 w-full mx-auto px-6 py-6 overflow-y-auto overscroll-y-contain">
                        {children}
                    </main>
                    <footer className="shrink-0 border-t border-mist">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-6 py-3 text-[11px] text-fog">
                            <span className="font-medium text-smoke">
                                Stackboard
                            </span>
                            <span className="tabular rounded-tags border border-mist px-1.5 py-px text-fog">
                                v{packageJson.version}
                            </span>
                            <FooterDivider />
                            <a
                                href={`${REPO_URL}/blob/main/LICENSE`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-ink transition-colors"
                            >
                                MIT License
                            </a>
                            <FooterDivider />
                            <span>© {new Date().getFullYear()}</span>

                            <nav
                                aria-label="Footer"
                                className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2"
                            >
                                <a
                                    href={REPO_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group inline-flex items-center gap-1.5 hover:text-ink transition-colors"
                                >
                                    <span className="inline-flex transition-transform duration-150 group-hover:rotate-12">
                                        <GithubIcon size={13} />
                                    </span>
                                    creativoma/stackboard
                                </a>
                                <FooterDivider />
                                <a
                                    href="https://github.com/creativoma"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-ink transition-colors"
                                >
                                    built by creativoma
                                </a>
                            </nav>
                        </div>
                    </footer>
                </div>
            </div>
        </NotificationsLive>
    )
}
