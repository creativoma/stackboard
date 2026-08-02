import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { LayoutGrid, LogOut } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/session'
import { logoutAction } from '../(auth)/actions'

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

    return (
        <div className="h-screen flex bg-snow">
            <aside className="w-60 shrink-0 h-screen sticky top-0 bg-paper border-r border-mist py-4">
                <Link href="/boards" className="flex items-center px-4 mb-6">
                    <img
                        src="/logos/logo-color.svg"
                        alt="Stackboard"
                        className="h-7 w-auto"
                    />
                </Link>
                <nav aria-label="Main" className="px-2 flex flex-col gap-0.5">
                    <Link
                        href="/boards"
                        className="flex items-center gap-2.5 rounded-buttons px-2.5 py-2 text-sm font-semibold text-electric-blue bg-(--color-electric-blue-tint)"
                    >
                        <LayoutGrid
                            size={17}
                            strokeWidth={2}
                            className="shrink-0"
                            aria-hidden="true"
                        />
                        Boards
                    </Link>
                </nav>
            </aside>

            <div className="flex-1 min-w-0 flex flex-col h-screen">
                <header className="sticky top-0 z-10 shrink-0 bg-paper border-b border-mist">
                    <div className="w-full flex items-center justify-end gap-1 px-6 h-16">
                        <Link
                            href="/boards/account"
                            className="flex items-center gap-2.5 rounded-buttons px-2.5 py-2 hover:bg-snow transition-colors"
                        >
                            <span
                                className="w-8 h-8 rounded-full bg-lavender text-ink text-[12px] font-semibold flex items-center justify-center shrink-0"
                                aria-hidden="true"
                            >
                                {user.name.slice(0, 1).toUpperCase()}
                            </span>
                            <div className="min-w-0 hidden sm:block">
                                <p className="text-sm font-medium text-ink truncate">
                                    {user.name}
                                </p>
                                <p className="text-xs text-fog truncate">
                                    {user.email}
                                </p>
                            </div>
                        </Link>
                        <form action={logoutAction}>
                            <button
                                type="submit"
                                className="flex items-center gap-2.5 rounded-buttons px-2.5 py-2 text-sm font-medium text-smoke hover:bg-snow hover:text-ink transition-colors"
                            >
                                <LogOut
                                    size={16}
                                    strokeWidth={2}
                                    className="shrink-0"
                                    aria-hidden="true"
                                />
                                <span className="hidden sm:inline">
                                    Log out
                                </span>
                            </button>
                        </form>
                    </div>
                </header>

                <main className="flex-1 min-h-0 w-full mx-auto px-6 py-6 overflow-y-auto">
                    {children}
                </main>
                <footer className="border-t border-mist">
                    <div className="w-full mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-xs text-fog">
                        <span>
                            © {new Date().getFullYear()} Stackboard. All rights
                            reserved.
                        </span>
                        <nav
                            aria-label="Footer"
                            className="flex flex-wrap items-center gap-4"
                        >
                            <Link
                                href="/boards"
                                className="hover:text-ink transition-colors"
                            >
                                Boards
                            </Link>
                            <Link
                                href="/boards/changelog"
                                className="hover:text-ink transition-colors"
                            >
                                What&apos;s new
                            </Link>
                            <Link
                                href="/boards/account"
                                className="hover:text-ink transition-colors"
                            >
                                Account
                            </Link>
                            <Link
                                href="/privacy"
                                className="hover:text-ink transition-colors"
                            >
                                Privacy
                            </Link>
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
    )
}
