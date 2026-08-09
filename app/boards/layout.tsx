import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth/session'
import { countUnreadNotifications } from '@/lib/queries/notifications'
import { NavLinks } from './nav-links'
import { UserMenu } from './user-menu'
import { HeaderActions } from './header-actions'
import { NotificationsLive } from './notifications-live'

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
                            for the logo. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/logos/logo-color.svg"
                            alt="Stackboard"
                            className="h-5 w-auto"
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

                    <main className="flex-1 min-h-0 w-full mx-auto px-6 py-6 overflow-y-auto">
                        {children}
                    </main>
                    <footer className="border-t border-mist">
                        <div className="w-full mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-xs text-fog">
                            <span>
                                © {new Date().getFullYear()} Stackboard. All
                                rights reserved.
                            </span>
                            <nav
                                aria-label="Footer"
                                className="flex flex-wrap items-center gap-4"
                            >
                                <a
                                    href="https://github.com/creativoma/stackboard"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
                                >
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 16 16"
                                        fill="currentColor"
                                        aria-hidden="true"
                                        className="shrink-0"
                                    >
                                        <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.44 7.44 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                                    </svg>
                                    creativoma/stackboard
                                </a>
                                <a
                                    href="https://github.com/creativoma"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-ink transition-colors"
                                >
                                    Made by creativoma
                                </a>
                            </nav>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-(--color-success)" />
                                All systems operational · v0.1.0
                            </span>
                        </div>
                    </footer>
                </div>
            </div>
        </NotificationsLive>
    )
}
